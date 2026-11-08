# EduLine API image for Cloud Run.
#   docker build -t eduline-api:local backend
#
# No secrets are baked in: DATABASE_URL, JWT_ACCESS_SECRET, etc. come from the
# Cloud Run service config / Secret Manager at runtime. PORT is set by Cloud Run.

# Debian (glibc) so argon2 loads its prebuilt binary instead of compiling.
FROM node:20-bookworm-slim AS base
# Prisma's query engine needs OpenSSL; ca-certificates for TLS to Cloud SQL / APIs.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- build: compile TypeScript, then drop devDependencies ----
FROM base AS build
# package-lock.json is written by npm 11; the npm 10 bundled with Node 20 rejects
# it in `npm ci` (optional peer deps are resolved differently).
RUN npm install -g npm@11.16.0
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build \
 && npm prune --omit=dev

# ---- runtime: only what `node dist/main` needs ----
FROM base AS runtime
ENV NODE_ENV=production
# Files stay owned by root, so the app user cannot modify its own code.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
USER node
CMD ["node", "dist/main"]
