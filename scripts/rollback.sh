#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  scripts/rollback.sh — Rollback manuel vers la version précédente         ║
# ║                                                                            ║
# ║  Usage : ssh deploy@<VM_IP> 'bash /opt/meetz/scripts/rollback.sh'        ║
# ║                                                                            ║
# ║  Restaure les images taggées :previous (sauvegardées automatiquement      ║
# ║  avant chaque déploiement) et redémarre les services.                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

DEPLOY_DIR="/opt/meetz"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
LOG_FILE="$DEPLOY_DIR/deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ROLLBACK] $*" | tee -a "$LOG_FILE"; }

log "=== Déclenchement du rollback manuel ==="

cd "$DEPLOY_DIR"

ROLLBACK_POSSIBLE=true

for img in meetz-backend meetz-web; do
  if ! docker image inspect "${img}:previous" &>/dev/null; then
    log "ERREUR : aucune image ${img}:previous trouvée. Rollback impossible pour ce service."
    ROLLBACK_POSSIBLE=false
  fi
done

if [[ "$ROLLBACK_POSSIBLE" != "true" ]]; then
  log "Rollback annulé — image(s) :previous manquante(s)."
  log "Vérifier avec : docker images | grep meetz"
  exit 1
fi

log "→ Restauration des images :previous vers :latest..."
docker tag meetz-backend:previous meetz-backend:latest
docker tag meetz-web:previous meetz-web:latest
log "  ✓ Images restaurées"

log "→ Redémarrage des services avec les images précédentes..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

log "→ Attente du démarrage (15s)..."
sleep 15

if curl -sf --max-time 5 http://localhost:3000/api/v1 > /dev/null 2>&1; then
  log "✓ Application opérationnelle après rollback."
else
  log "ECHEC : l'application ne répond pas même après le rollback."
  log "Intervention manuelle requise. Logs :"
  docker compose -f "$COMPOSE_FILE" logs --tail=50 meetz-backend | tee -a "$LOG_FILE"
  exit 1
fi

log "=== Rollback terminé avec succès ==="
docker compose -f "$COMPOSE_FILE" ps | tee -a "$LOG_FILE"
