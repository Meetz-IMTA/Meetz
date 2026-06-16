# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Meetz — Dockerfile Frontend                                              ║
# ║  Stack  : Angular 21 (@angular/build:application) + Nginx Alpine          ║
# ║  Build  : Multi-stage (node builder → nginx serveur)                      ║
# ║  Output : Fichiers statiques SPA dans dist/web/browser/                   ║
# ║  Context: Racine du monorepo (docker build -f docker/web/Dockerfile .)    ║
# ╚══════════════════════════════════════════════════════════════════════════╝

# ── Stage 1 : Build Angular ────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

# Copie des manifestes pour profiter du cache Docker layer.
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --ignore-scripts

# Copie du code source Angular.
COPY apps/web/ ./apps/web/
COPY packages/ ./packages/

# Build de production Angular.
# @angular/build:application produit les fichiers dans :
#   apps/web/dist/web/browser/  → fichiers SPA (HTML, JS, CSS, assets)
# La configuration "production" active : tree-shaking, minification,
# output hashing (cache-busting), et les budgets de taille.
RUN cd apps/web && npx ng build --configuration production

# ── Stage 2 : Serveur Nginx minimal ──────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Suppression de la config Nginx par défaut.
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copie des fichiers buildés depuis le stage builder.
# Le chemin dist/web/browser/ correspond à l'output de @angular/build:application
# avec un projet nommé "web" (voir apps/web/angular.json).
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

# Configuration Nginx pour SPA Angular.
# Toutes les routes inconnues sont redirigées vers index.html
# (Angular Router gère la navigation côté client).
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
