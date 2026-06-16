#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  scripts/setup-vm.sh — Préparation complète de la VM Debian 13           ║
# ║                                                                            ║
# ║  À exécuter UNE SEULE FOIS sur la VM, AVANT de couper Internet.           ║
# ║  Commande : sudo bash setup-vm.sh                                         ║
# ║                                                                            ║
# ║  Ce script est idempotent : il peut être relancé sans danger.             ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

# ── Couleurs & helpers d'affichage ────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

step()    { echo -e "\n${BLUE}${BOLD}══ $* ${RESET}"; }
ok()      { echo -e "  ${GREEN}✓${RESET} $*"; }
warn()    { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
info()    { echo -e "  ${CYAN}→${RESET} $*"; }
fatal()   { echo -e "\n${RED}${BOLD}ERREUR FATALE :${RESET} $*\n"; exit 1; }

# ── Vérifications préliminaires ───────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  fatal "Ce script doit être exécuté en root.\n  Relancer avec : sudo bash $0"
fi

if ! grep -qi "trixie\|debian.*13" /etc/os-release 2>/dev/null; then
  warn "Ce script est conçu pour Debian 13 (Trixie)."
  warn "Distribution détectée : $(. /etc/os-release && echo "$PRETTY_NAME")"
  read -rp "  Continuer quand même ? [o/N] " CONT
  [[ "${CONT,,}" == "o" ]] || fatal "Script annulé."
fi

if ! ping -c 1 -W 3 8.8.8.8 &>/dev/null; then
  fatal "Pas d'accès Internet. Ce script doit être exécuté AVANT d'isoler la VM."
fi

echo -e "\n${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║        Meetz — Setup VM Debian 13 (Proxmox / Air-Gap)        ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Ce script va :"
echo -e "   1. Mettre à jour le système"
echo -e "   2. Installer Docker CE + outils système"
echo -e "   3. Créer l'utilisateur '${BOLD}deploy${RESET}' (non-root, groupe docker)"
echo -e "   4. Créer la structure /opt/meetz/"
echo -e "   5. Sécuriser la configuration SSH"
echo -e "   6. Pré-télécharger les images Docker de base"
echo -e "   7. Créer le volume Docker persistant MariaDB"
echo -e "   8. Générer le template .env.prod"
echo ""
read -rp "Appuyer sur [Entrée] pour commencer, ou Ctrl+C pour annuler..."

LOG_FILE="/var/log/meetz-setup.log"
exec > >(tee -a "$LOG_FILE") 2>&1
info "Journal complet disponible dans $LOG_FILE"

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 1 — Mise à jour du système
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 1/8 — Mise à jour du système"

apt-get update -qq
apt-get upgrade -y -qq
ok "Système à jour."

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 2 — Outils système + Docker CE
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 2/8 — Installation des outils système"

apt-get install -y -qq \
  curl wget gnupg2 ca-certificates apt-transport-https \
  tar gzip rsync jq openssl \
  net-tools iproute2 \
  sudo \
  openssh-server \
  vim less htop

ok "Outils système installés."

step "           Installation de Docker CE (dépôt officiel)"

if command -v docker &>/dev/null; then
  warn "Docker déjà installé ($(docker --version)). Étape ignorée."
else
  # Ajout de la clé GPG officielle Docker
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  # Ajout du dépôt Docker pour Debian Trixie
  CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/debian ${CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker
  ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') installé et démarré."
fi

docker compose version &>/dev/null && ok "Docker Compose plugin disponible." \
  || fatal "Docker Compose plugin non trouvé."

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 3 — Utilisateur deploy
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 3/8 — Création de l'utilisateur 'deploy'"

if id deploy &>/dev/null; then
  warn "Utilisateur 'deploy' déjà existant. Vérification du groupe docker..."
else
  useradd -m -s /bin/bash deploy
  ok "Utilisateur 'deploy' créé."
fi

usermod -aG docker deploy
ok "Utilisateur 'deploy' ajouté au groupe docker."

# Répertoire SSH (pour la clé publique du runner GitHub qui sera ajoutée plus tard)
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
ok "Répertoire ~/.ssh/authorized_keys de 'deploy' prêt."

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 4 — Structure des répertoires de déploiement
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 4/8 — Création de /opt/meetz/"

mkdir -p /opt/meetz/{images,db/init,scripts,backups}
chown -R deploy:deploy /opt/meetz
chmod 750 /opt/meetz
ok "Structure /opt/meetz/ créée :"
find /opt/meetz -maxdepth 2 -type d | sort | while read -r d; do
  info "$d"
done

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 5 — Sécurisation SSH
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 5/8 — Sécurisation de la configuration SSH"

SSHD_CONF="/etc/ssh/sshd_config"

# Sauvegarde de la config originale
if [[ ! -f "${SSHD_CONF}.bak" ]]; then
  cp "$SSHD_CONF" "${SSHD_CONF}.bak"
  ok "Sauvegarde de sshd_config créée → ${SSHD_CONF}.bak"
fi

# Fonction pour setter/remplacer une directive dans sshd_config
sshd_set() {
  local KEY="$1" VAL="$2"
  if grep -qE "^#?${KEY}" "$SSHD_CONF"; then
    sed -i "s|^#*${KEY}.*|${KEY} ${VAL}|" "$SSHD_CONF"
  else
    echo "${KEY} ${VAL}" >> "$SSHD_CONF"
  fi
}

sshd_set "PermitRootLogin"          "no"
sshd_set "PasswordAuthentication"   "no"
sshd_set "PubkeyAuthentication"     "yes"
sshd_set "AuthorizedKeysFile"       ".ssh/authorized_keys"
sshd_set "AllowUsers"               "deploy"
sshd_set "X11Forwarding"            "no"
sshd_set "MaxAuthTries"             "4"
sshd_set "LoginGraceTime"           "30"

# Validation de la config avant de recharger
if sshd -t 2>/dev/null; then
  systemctl enable --now ssh
  systemctl restart ssh
  ok "SSH sécurisé et redémarré."
else
  warn "La configuration SSH générée est invalide. Restauration de la sauvegarde..."
  cp "${SSHD_CONF}.bak" "$SSHD_CONF"
  systemctl restart ssh
  warn "Config SSH originale restaurée. Sécuriser manuellement."
fi

echo ""
warn "IMPORTANT : l'authentification par mot de passe est désormais DÉSACTIVÉE."
warn "Ajoute la clé publique du runner dans /home/deploy/.ssh/authorized_keys"
warn "AVANT de fermer cette session SSH (voir Section 2 du guide)."

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 6 — Pré-téléchargement des images Docker de base
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 6/8 — Pré-téléchargement des images Docker (cache local)"
info "Ces images seront utilisées par les Dockerfiles lors des déploiements."
info "Elles doivent être présentes car la VM n'aura plus Internet après isolation."

IMAGES=(
  "node:22-slim"
  "nginx:1.27-alpine"
  "mariadb:11"
)

for IMG in "${IMAGES[@]}"; do
  info "Téléchargement de ${IMG}..."
  docker pull "$IMG"
  ok "${IMG} disponible."
done

info "Sauvegarde des images en archives .tar.gz (copies de secours dans /opt/meetz/images/)..."
docker save node:22-slim      | gzip -9 > /opt/meetz/images/node22-slim.tar.gz
docker save nginx:1.27-alpine | gzip -9 > /opt/meetz/images/nginx-alpine.tar.gz
docker save mariadb:11        | gzip -9 > /opt/meetz/images/mariadb11.tar.gz

chown deploy:deploy /opt/meetz/images/*.tar.gz

ok "Archives sauvegardées :"
ls -lh /opt/meetz/images/*.tar.gz | awk '{print "   ", $5, $9}'

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 7 — Volume Docker persistant MariaDB
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 7/8 — Création du volume Docker persistant pour MariaDB"

if docker volume inspect meetz-db-data &>/dev/null; then
  warn "Volume 'meetz-db-data' déjà existant. Ignoré (données préservées)."
else
  docker volume create meetz-db-data
  ok "Volume 'meetz-db-data' créé."
fi

info "Emplacement physique des données MariaDB :"
docker volume inspect meetz-db-data \
  | python3 -c "import json,sys; v=json.load(sys.stdin); print('   ', v[0]['Mountpoint'])"

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 8 — Génération du template .env.prod
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 8/8 — Génération du fichier .env.prod"

ENV_FILE="/opt/meetz/.env.prod"

if [[ -f "$ENV_FILE" ]]; then
  warn ".env.prod déjà existant. Non écrasé (tes valeurs sont préservées)."
else
  # Génération automatique des secrets cryptographiques
  ACCESS_SECRET=$(openssl rand -hex 64)
  REFRESH_SECRET=$(openssl rand -hex 64)
  DB_PASSWORD=$(openssl rand -base64 24 | tr -d '=/+' | cut -c1-24)
  DB_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+' | cut -c1-32)

  cat > "$ENV_FILE" << EOF
# ════════════════════════════════════════════════════════
#  Meetz — Configuration de production
#  Généré le $(date '+%Y-%m-%d %H:%M:%S')
#  Compléter les champs marqués <A_REMPLIR>
# ════════════════════════════════════════════════════════

# ── MariaDB ──────────────────────────────────────────────
MYSQL_DATABASE=meetz
MYSQL_USER=meetz
MYSQL_PASSWORD=${DB_PASSWORD}
MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}

# ── Prisma (connexion via réseau Docker interne) ──────────
DATABASE_URL=mysql://meetz:${DB_PASSWORD}@meetz-db:3306/meetz

# ── Express ───────────────────────────────────────────────
PORT=3000
NODE_ENV=production

# ⚠ Remplacer par ton domaine public (ex: https://meetz.tondomaine.fr)
# ⚠ Corriger aussi apps/backend/src/index.ts ligne 19 (CORS Socket.io)
CORS_ORIGIN=https://<A_REMPLIR_TON_DOMAINE>

# ── JWT (secrets générés automatiquement) ─────────────────
ACCESS_TOKEN_SECRET=${ACCESS_SECRET}
REFRESH_TOKEN_SECRET=${REFRESH_SECRET}

# ── Chiffrement du chat ────────────────────────────────────
# Récupérer la valeur depuis apps/backend/.env (CHAT_ENCRYPTION_KEY)
CHAT_ENCRYPTION_KEY=<A_REMPLIR_DEPUIS_LOCAL_ENV>

# ── Cloudinary ────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=<A_REMPLIR>
CLOUDINARY_API_KEY=<A_REMPLIR>
CLOUDINARY_API_SECRET=<A_REMPLIR>

# ── Email (Mailtrap / Nodemailer) ─────────────────────────
MAILTRAP_TOKEN=<A_REMPLIR>
EOF

  chmod 600 "$ENV_FILE"
  chown deploy:deploy "$ENV_FILE"
  ok ".env.prod créé dans $ENV_FILE (chmod 600)"
fi

# ─────────────────────────────────────────────────────────────────────────
# RÉCAPITULATIF FINAL
# ─────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║                  SETUP TERMINÉ AVEC SUCCÈS                  ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${GREEN}${BOLD}Ce qui a été fait :${RESET}"
ok "Système Debian 13 mis à jour"
ok "Docker CE $(docker --version | cut -d' ' -f3 | tr -d ',') + Compose plugin installés"
ok "Utilisateur 'deploy' créé (groupe docker)"
ok "Structure /opt/meetz/ prête"
ok "SSH sécurisé (root désactivé, password auth désactivé)"
ok "Images Docker pré-téléchargées et sauvegardées dans /opt/meetz/images/"
ok "Volume Docker 'meetz-db-data' créé"
ok "/opt/meetz/.env.prod généré (secrets JWT auto-générés)"
echo ""
echo -e "${YELLOW}${BOLD}Actions MANUELLES restantes (indispensables avant le premier déploiement) :${RESET}"
echo ""
echo -e "  ${BOLD}1.${RESET} Compléter /opt/meetz/.env.prod :"
echo -e "       ${CYAN}nano /opt/meetz/.env.prod${RESET}"
echo -e "       → Remplir : CHAT_ENCRYPTION_KEY, CORS_ORIGIN,"
echo -e "         CLOUDINARY_*, MAILTRAP_TOKEN"
echo ""
echo -e "  ${BOLD}2.${RESET} Ajouter la clé publique SSH du runner GitHub dans :"
echo -e "       ${CYAN}/home/deploy/.ssh/authorized_keys${RESET}"
echo -e "       (Générer sur le LXC : ssh-keygen -t ed25519 -f ~/.ssh/vm_deploy)"
echo ""
echo -e "  ${BOLD}3.${RESET} Corriger le CORS Socket.io dans le code :"
echo -e "       ${CYAN}apps/backend/src/index.ts ligne 19${RESET}"
echo -e "       → Remplacer 'http://localhost:4200' par"
echo -e "         process.env[\"CORS_ORIGIN\"] ?? 'http://localhost:4200'"
echo ""
echo -e "  ${BOLD}4.${RESET} Configurer les GitHub Secrets (Settings → Actions → Secrets) :"
echo -e "       ${CYAN}VM_HOST${RESET}             = IP locale de cette VM"
echo -e "       ${CYAN}VM_USER${RESET}             = deploy"
echo -e "       ${CYAN}VM_SSH_PRIVATE_KEY${RESET}  = contenu de ~/.ssh/vm_deploy (sur le LXC)"
echo -e "       ${CYAN}CHAT_ENCRYPTION_KEY${RESET} = valeur dans apps/backend/.env"
echo ""
echo -e "  ${BOLD}5.${RESET} Couper Internet sur cette VM (retirer la passerelle dans Proxmox)."
echo ""
echo -e "  ${BOLD}6.${RESET} Installer et configurer le runner GitHub sur le LXC"
echo -e "       (voir Section 2 du guide CI/CD)."
echo ""
echo -e "  Journal complet disponible dans : ${CYAN}$LOG_FILE${RESET}"
echo ""
