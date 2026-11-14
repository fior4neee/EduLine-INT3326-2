# Build from the repository root: docker build -f worker/Dockerfile -t eduline-worker:local .
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/worker

FROM base AS build
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY worker/package.json worker/package-lock.json ./
RUN npm ci --no-audit --no-fund
# Existing sources are read-only inputs, compiled using the worker's dependencies.
COPY backend/src /app/backend/src
COPY backend/prisma /app/backend/prisma
COPY worker/tsconfig.json ./
COPY worker/scripts ./scripts
COPY worker/src ./src
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
COPY --from=build /app/worker/package.json ./package.json
COPY --from=build /app/worker/node_modules ./node_modules
COPY --from=build /app/worker/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/worker/src/main.js"]
