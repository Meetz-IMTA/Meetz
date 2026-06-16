#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  scripts/deploy-on-vm.sh — Script de déploiement exécuté sur la VM       ║
# ║                                                                            ║
# ║  Usage normal : appelé automatiquement par le workflow GitHub Actions.    ║
# ║  Usage manuel : ssh deploy@<VM_IP> 'bash /opt/meetz/scripts/deploy.sh'   ║
# ║                                                                            ║
# ║  Prérequis sur la VM :                                                    ║
# ║    - Docker + Docker Compose plugin installés                             ║
# ║    - /opt/meetz/.env.prod existant et configuré                           ║
# ║    - Volume Docker `meetz-db-data` créé (`docker volume create ...`)      ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

DEPLOY_DIR="/opt/meetz"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env.prod"
LOG_FILE="$DEPLOY_DIR/deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# ── Validation de l'environnement ────────────────────────────────────────
log "=== Démarrage du déploiement Meetz ==="

if [[ ! -f "$ENV_FILE" ]]; then
  log "ERREUR : $ENV_FILE introuvable. Créer le fichier avant de déployer."
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  log "ERREUR : $COMPOSE_FILE introuvable."
  exit 1
fi

cd "$DEPLOY_DIR"

# ── Rollback snapshot : tag des images courantes en :previous ────────────
log "→ Sauvegarde des images courantes en :previous (rollback snapshot)..."
for img in meetz-backend meetz-web; do
  if docker image inspect "${img}:latest" &>/dev/null; then
    docker tag "${img}:latest" "${img}:previous"
    log "  ✓ ${img}:previous sauvegardée"
  else
    log "  ⚠ ${img}:latest absente (premier déploiement ou image manquante)"
  fi
done

# ── Chargement des nouvelles images ──────────────────────────────────────
log "→ Chargement des images Docker depuis les archives .tar.gz..."

for archive in meetz-backend.tar.gz meetz-web.tar.gz; do
  if [[ ! -f "$DEPLOY_DIR/$archive" ]]; then
    log "ERREUR : archive $archive introuvable dans $DEPLOY_DIR"
    exit 1
  fi
  docker load < "$DEPLOY_DIR/$archive"
  log "  ✓ $archive chargée"
done

# ── Redémarrage des services ──────────────────────────────────────────────
log "→ Redémarrage des conteneurs (docker compose up)..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ── Nettoyage des archives temporaires ───────────────────────────────────
log "→ Nettoyage des archives temporaires..."
rm -f "$DEPLOY_DIR/meetz-backend.tar.gz" "$DEPLOY_DIR/meetz-web.tar.gz"

# ── Health check ─────────────────────────────────────────────────────────
log "→ Health check (attente 20s pour le démarrage de l'application)..."
sleep 20

MAX_RETRIES=3
RETRY_DELAY=10
BACKEND_OK=false

for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf --max-time 5 http://localhost:3000/api/v1 > /dev/null 2>&1; then
    BACKEND_OK=true
    log "  ✓ Health check réussi (tentative $i/$MAX_RETRIES)"
    break
  fi
  log "  ✗ Tentative $i/$MAX_RETRIES échouée. Retry dans ${RETRY_DELAY}s..."
  sleep "$RETRY_DELAY"
done

# ── Rollback automatique si health check échoue ───────────────────────────
if [[ "$BACKEND_OK" != "true" ]]; then
  log "ECHEC du health check — déclenchement du ROLLBACK automatique."

  for img in meetz-backend meetz-web; do
    if docker image inspect "${img}:previous" &>/dev/null; then
      docker tag "${img}:previous" "${img}:latest"
      log "  ✓ ${img} restaurée depuis :previous"
    else
      log "  ⚠ Pas d'image :previous pour ${img} — rollback impossible pour ce service"
    fi
  done

  log "→ Redémarrage avec les images précédentes..."
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

  log "=== Logs du backend (50 dernières lignes) ==="
  docker compose -f "$COMPOSE_FILE" logs --tail=50 meetz-backend | tee -a "$LOG_FILE"

  log "ROLLBACK TERMINÉ. Voir $LOG_FILE pour les détails."
  exit 1
fi

# ── Rapport final ─────────────────────────────────────────────────────────
log "→ Nettoyage des vieilles images Docker (antérieures à 7 jours)..."
docker image prune -f --filter "until=168h" >> "$LOG_FILE" 2>&1 || true

log "=== Déploiement terminé avec succès ==="
docker compose -f "$COMPOSE_FILE" ps | tee -a "$LOG_FILE"
