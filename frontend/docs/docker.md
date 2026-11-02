# Docker

**Status: not set up.** There is no `Dockerfile` in `frontend/` or anywhere else in the repo yet. Docker and deployment belong to **M5**. This page records how the frontend is expected to be containerized, so M5 and M4 start from the same plan.

## Why the frontend needs a container

The [root README](../../README.md#5-system-architecture-gcp) runs the web app as a **Cloud Run** service named `web` behind the HTTPS load balancer. Cloud Run only runs containers, so the frontend has to ship as a Docker image.

`npm run build` produces only static files (`dist/`). The container therefore needs a small web server, not Node.js.

## Proposed Dockerfile (for review, not committed)

```dockerfile
# Stage 1: build the static site
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite inlines VITE_ variables at build time, so they are build arguments
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: serve dist/ with nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
```

With this `nginx.conf`:

```nginx
server {
  listen 8080;                       # Cloud Run's default port
  root /usr/share/nginx/html;

  location / {
    try_files $uri /index.html;      # lets React Router handle /login, /courses/1234, …
  }

  location /assets/ {
    expires 1y;                      # Vite puts a content hash in these file names
    add_header Cache-Control "public, immutable";
  }
}
```

And a `.dockerignore`, so local files stay out of the image:

```
node_modules
dist
.env*
```

## Things to know

- **Node 22** in the build stage: Vite 8 needs Node 20.19+ or 22.12+.
- **`VITE_API_BASE_URL` is fixed at build time.** Each environment (dev, prod) needs its own image build: `docker build --build-arg VITE_API_BASE_URL=https://…/api/v1 -t eduline-web .`. Alternatively, serve web and API from the same domain (`/` and `/api/*` on the load balancer, as the root README plans) and set it to `/api/v1`, so one image works everywhere.
- **The `try_files` line matters.** Without it, refreshing any page other than `/` returns 404 ([routing.md](routing.md#hosting-note)).
- The final image holds only nginx and the static files, with no Node.js, `node_modules` or source code, so it stays small.

## Running locally (once the files exist)

```bash
# from frontend/
docker build --build-arg VITE_API_BASE_URL=http://localhost:3000/api/v1 -t eduline-web .
docker run --rm -p 8080:8080 eduline-web
# open http://localhost:8080
```

For day-to-day development, keep using `npm run dev`. It reloads on save; a container does not. The root README's planned `docker-compose` (api, web, worker, postgres, redis, emulators) is for running the whole stack together.
