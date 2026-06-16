#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  scripts/setup-lxc.sh — Configuration complète du LXC Meetz             ║
# ║                                                                            ║
# ║  À exécuter sur le LXC après y avoir obtenu un accès SSH root.           ║
# ║  Commande : bash setup-lxc.sh                                            ║
# ║                                                                            ║
# ║  Ce script installe et configure :                                        ║
# ║    - Docker CE                                                            ║
# ║    - Node.js 22                                                           ║
# ║    - Nginx (reverse proxy) + Certbot (SSL)                               ║
# ║    - Utilisateur github-runner                                            ║
# ║    - Clé SSH vers la VM                                                   ║
# ║    - GitHub Actions Runner (binaire + service systemd)                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

# ── Couleurs & helpers ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

step()  { echo -e "\n${BLUE}${BOLD}══ $* ${RESET}"; }
ok()    { echo -e "  ${GREEN}✓${RESET} $*"; }
warn()  { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
info()  { echo -e "  ${CYAN}→${RESET} $*"; }
fatal() { echo -e "\n${RED}${BOLD}ERREUR FATALE :${RESET} $*\n"; exit 1; }

# ── Vérifications préliminaires ───────────────────────────────────────────
[[ $EUID -ne 0 ]] && fatal "Ce script doit être exécuté en root. Relancer avec : sudo bash $0"

if ! ping -c 1 -W 3 8.8.8.8 &>/dev/null; then
  fatal "Pas d'accès Internet. Vérifier la configuration réseau du LXC."
fi

# ── Bannière ──────────────────────────────────────────────────────────────
echo -e "\n${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║         Meetz — Setup LXC (Runner + Nginx)                   ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"

# ── Collecte des paramètres ───────────────────────────────────────────────
echo ""
echo -e "${BOLD}Quelques informations nécessaires avant de commencer :${RESET}"
echo ""

read -rp "  IP locale de la VM Meetz (ex: 192.168.100.10) : " VM_IP
[[ -z "$VM_IP" ]] && fatal "L'IP de la VM est obligatoire."

read -rp "  Nom de domaine public (ex: meetz.online) : " DOMAIN
DOMAIN="${DOMAIN:-meetz.online}"

read -rp "  URL du repo GitHub (ex: https://github.com/Meetz-IMTA/Meetz) : " REPO_URL
[[ -z "$REPO_URL" ]] && fatal "L'URL du repo GitHub est obligatoire."

echo ""
echo -e "  Paramètres retenus :"
info "VM IP       : ${BOLD}$VM_IP${RESET}"
info "Domaine     : ${BOLD}$DOMAIN${RESET}"
info "Repo GitHub : ${BOLD}$REPO_URL${RESET}"
echo ""
read -rp "Appuyer sur [Entrée] pour commencer, ou Ctrl+C pour annuler..."

LOG_FILE="/var/log/meetz-lxc-setup.log"
exec > >(tee -a "$LOG_FILE") 2>&1
info "Journal disponible dans $LOG_FILE"

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 1 — Mise à jour système + outils de base
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 1/8 — Mise à jour système + outils de base"

apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget gnupg2 ca-certificates apt-transport-https \
  tar gzip rsync jq openssl \
  git openssh-client \
  sudo ufw fail2ban \
  vim less htop

ok "Outils système installés."

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 2 — Docker CE
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 2/8 — Installation de Docker CE"

if command -v docker &>/dev/null; then
  warn "Docker déjà installé ($(docker --version | cut -d' ' -f3 | tr -d ',')). Ignoré."
else
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

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
  ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') installé."
fi

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 3 — Node.js 22
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 3/8 — Installation de Node.js 22"

if node --version 2>/dev/null | grep -q "v22"; then
  warn "Node.js 22 déjà installé ($(node --version)). Ignoré."
else
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
  ok "Node.js $(node --version) installé."
fi

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 4 — Nginx + Certbot
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 4/8 — Installation de Nginx + Certbot"

apt-get install -y -qq nginx certbot python3-certbot-nginx
systemctl enable nginx
ok "Nginx installé."
ok "Certbot installé."

# Configuration Nginx — reverse proxy vers la VM
# SSL sera ajouté automatiquement par Certbot (certbot --nginx)
NGINX_CONF="/etc/nginx/sites-available/meetz"

cat > "$NGINX_CONF" << EOF
# Meetz — Reverse proxy Nginx
# Généré par setup-lxc.sh
# SSL à configurer via : certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}

server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Taille maximale des uploads (photos, images du chat)
    client_max_body_size 50M;

    # ── API Backend → VM:3000 ───────────────────────────────────────────
    location /api/ {
        proxy_pass         http://${VM_IP}:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout    120s;
        proxy_connect_timeout 10s;
    }

    # ── WebSocket Socket.io → VM:3000 ───────────────────────────────────
    location /socket.io/ {
        proxy_pass         http://${VM_IP}:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       \$host;
        proxy_set_header   X-Real-IP  \$remote_addr;
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
    }

    # ── Frontend Angular → VM:8080 ──────────────────────────────────────
    location / {
        proxy_pass         http://${VM_IP}:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}
EOF

# Activation de la config
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/meetz
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
ok "Config Nginx générée et activée pour ${DOMAIN}."

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 5 — Utilisateur github-runner
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 5/8 — Création de l'utilisateur 'github-runner'"

if id github-runner &>/dev/null; then
  warn "Utilisateur 'github-runner' déjà existant."
else
  useradd -m -s /bin/bash github-runner
  ok "Utilisateur 'github-runner' créé."
fi

usermod -aG docker github-runner
ok "Ajouté au groupe docker."

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 6 — Génération de la clé SSH vers la VM
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 6/8 — Génération de la clé SSH (LXC → VM)"

SSH_KEY="/home/github-runner/.ssh/vm_deploy"

mkdir -p /home/github-runner/.ssh
chmod 700 /home/github-runner/.ssh

if [[ -f "$SSH_KEY" ]]; then
  warn "Clé SSH déjà existante. Non écrasée."
else
  ssh-keygen -t ed25519 -C "github-runner@meetz-lxc" -f "$SSH_KEY" -N ""
  chown -R github-runner:github-runner /home/github-runner/.ssh
  chmod 600 "$SSH_KEY"
  chmod 644 "${SSH_KEY}.pub"
  ok "Paire de clés ED25519 générée."
fi

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 7 — /etc/hosts
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 7/8 — Configuration de /etc/hosts"

if grep -q "meetz-vm" /etc/hosts; then
  warn "Entrée meetz-vm déjà présente dans /etc/hosts."
else
  echo "${VM_IP}    meetz-vm" >> /etc/hosts
  ok "meetz-vm → ${VM_IP} ajouté dans /etc/hosts."
fi

# ─────────────────────────────────────────────────────────────────────────
# ÉTAPE 8 — GitHub Actions Runner (binaire + service)
# ─────────────────────────────────────────────────────────────────────────
step "ÉTAPE 8/8 — Installation du binaire GitHub Actions Runner"

RUNNER_DIR="/home/github-runner/actions-runner"

if [[ -f "$RUNNER_DIR/run.sh" ]]; then
  warn "Runner déjà installé dans $RUNNER_DIR. Ignoré."
else
  mkdir -p "$RUNNER_DIR"

  # Récupération de la dernière version disponible
  info "Récupération de la dernière version du runner..."
  RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest \
    | grep tag_name | cut -d'"' -f4 | sed 's/v//')
  info "Version : ${RUNNER_VERSION}"

  curl -fsSL \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" \
    -o /tmp/actions-runner.tar.gz

  tar xzf /tmp/actions-runner.tar.gz -C "$RUNNER_DIR"
  rm /tmp/actions-runner.tar.gz
  chown -R github-runner:github-runner "$RUNNER_DIR"

  ok "Runner v${RUNNER_VERSION} extrait dans $RUNNER_DIR."
fi

# ─────────────────────────────────────────────────────────────────────────
# RÉCAPITULATIF FINAL
# ─────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║               SETUP LXC TERMINÉ AVEC SUCCÈS                 ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${GREEN}${BOLD}Ce qui a été fait :${RESET}"
ok "Système mis à jour"
ok "Docker CE installé"
ok "Node.js $(node --version) installé"
ok "Nginx configuré pour ${DOMAIN}"
ok "Certbot installé"
ok "Utilisateur 'github-runner' créé (groupe docker)"
ok "Clé SSH ED25519 générée"
ok "Binaire GitHub Actions Runner installé"
echo ""

echo -e "${YELLOW}${BOLD}Actions MANUELLES restantes (dans cet ordre) :${RESET}"
echo ""

echo -e "${BOLD}── 1. Ajouter la clé publique SSH sur la VM ───────────────────${RESET}"
echo -e "   Copier cette clé dans /home/deploy/.ssh/authorized_keys sur la VM :"
echo ""
echo -e "   ${CYAN}$(cat ${SSH_KEY}.pub)${RESET}"
echo ""

echo -e "${BOLD}── 2. Ajouter la clé PRIVÉE dans les GitHub Secrets ───────────${RESET}"
echo -e "   Settings → Secrets and variables → Actions → VM_SSH_PRIVATE_KEY"
echo -e "   Valeur (copier tout le bloc) :"
echo ""
echo -e "   ${CYAN}$(cat ${SSH_KEY})${RESET}"
echo ""

echo -e "${BOLD}── 3. Enregistrer le runner auprès de GitHub ──────────────────${RESET}"
echo -e "   a) Sur GitHub : Settings → Actions → Runners → New self-hosted runner"
echo -e "      → Linux → x64 → copier le token affiché"
echo ""
echo -e "   b) Sur ce LXC, en tant que github-runner :"
echo -e "   ${CYAN}su - github-runner${RESET}"
echo -e "   ${CYAN}cd ~/actions-runner${RESET}"
echo -e "   ${CYAN}./config.sh --url ${REPO_URL} --token <TOKEN_GITHUB> --unattended --labels self-hosted${RESET}"
echo -e "   ${CYAN}exit${RESET}"
echo ""
echo -e "   c) Installer comme service systemd (en root) :"
echo -e "   ${CYAN}cd $RUNNER_DIR && ./svc.sh install github-runner && ./svc.sh start${RESET}"
echo ""

echo -e "${BOLD}── 4. Générer le certificat SSL ───────────────────────────────${RESET}"
echo -e "   (Vérifier d'abord que le domaine ${DOMAIN} pointe vers l'IP de ce LXC)"
echo -e "   ${CYAN}certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}${RESET}"
echo ""

echo -e "${BOLD}── 5. Configurer les GitHub Secrets restants ──────────────────${RESET}"
echo -e "   ${CYAN}VM_HOST${RESET}  = ${VM_IP}"
echo -e "   ${CYAN}VM_USER${RESET}  = deploy"
echo ""

echo -e "  Journal complet : ${CYAN}$LOG_FILE${RESET}"
echo ""
