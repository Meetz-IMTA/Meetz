# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Meetz — Dockerfile Backend                                               ║
# ║  Stack   : Node.js 22, TypeScript (ESM), Express 5, Prisma 7             ║
# ║  DB      : MariaDB 11 via @prisma/adapter-mariadb                        ║
# ║  Build   : Multi-stage (deps → build → runner)                           ║
# ║  Context : Racine du monorepo (docker build -f docker/backend/Dockerfile .) ║
# ╚══════════════════════════════════════════════════════════════════════════╝

# ── Stage 1 : Dépendances de production uniquement ────────────────────────
# Ce stage isolé permet au cache Docker de ne pas être invalidé si seul
# le code source change (et non les dépendances npm).
FROM node:22-slim AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# --omit=dev exclut vitest, nodemon, @types/* → image finale plus légère.
# --ignore-scripts évite l'exécution de postinstall hooks potentiellement
# dangereux pendant le build (ex: husky).
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2 : Dépendances complètes + Build TypeScript ────────────────────
FROM node:22-slim AS builder
WORKDIR /app

# OpenSSL requis par Prisma pour chiffrer les connexions MySQL/MariaDB.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copie des manifestes et installation de TOUTES les dépendances (y compris dev).
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --ignore-scripts

# Copie du code source complet du monorepo.
COPY . .

# Génération du client Prisma (sortie : apps/backend/src/generated/prisma).
# DATABASE_URL factice : prisma generate n'établit aucune connexion réelle,
# il lit uniquement le schéma pour générer le code TypeScript/JavaScript.
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy" \
    npx --prefix apps/backend prisma generate \
    --schema=apps/backend/prisma/schema.prisma

# Compilation TypeScript → JavaScript.
# rootDir/outDir sont commentés dans tsconfig.json (compatibilité dev),
# on les passe explicitement en CLI pour le build de production.
RUN npx --prefix apps/backend tsc \
    --project apps/backend/tsconfig.json \
    --rootDir apps/backend/src \
    --outDir apps/backend/dist \
    --noEmit false \
    --skipLibCheck

# Le client Prisma généré (JS pur) n'est PAS compilé par tsc.
# Il doit être copié manuellement dans dist/ car les imports résolus au runtime
# cherchent le chemin ../generated/prisma relatif aux fichiers dans dist/.
RUN cp -r apps/backend/src/generated apps/backend/dist/generated

# ── Stage 3 : Image de production minimale ────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

# Même version d'OpenSSL que le stage builder pour la compatibilité Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*

# Utilisateur non-root : principe du moindre privilège.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --shell /bin/false nodeapp

# Copie sélective des artefacts strictement nécessaires au runtime.
COPY --from=builder  --chown=nodeapp:nodejs /app/apps/backend/dist ./dist
COPY --from=builder  --chown=nodeapp:nodejs /app/apps/backend/package.json ./package.json
COPY --from=prod-deps --chown=nodeapp:nodejs /app/node_modules ./node_modules

ENV NODE_ENV=production \
    PORT=3000

USER nodeapp
EXPOSE 3000

# Healthcheck natif Docker : vérifie que le serveur Express répond.
# start-period laisse le temps à Prisma de se connecter à MariaDB au démarrage.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -sf http://localhost:3000/api/v1 || exit 1

CMD ["node", "dist/index.js"]
