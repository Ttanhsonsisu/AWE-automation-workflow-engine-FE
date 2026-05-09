# ============================================================
# Stage 1: Build — produces a "generic" bundle with NO env baked in
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies (ci = clean install, faster & reproducible)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build production bundle.
# NOTE: We do NOT pass any VITE_* build args here.
# All runtime config is injected via config.js at container start.
RUN npm run build

# ============================================================
# Stage 2: Serve with Nginx + runtime config injection
# ============================================================
FROM nginx:1.27-alpine AS production

# Install envsubst (part of gettext) — used in entrypoint to generate config.js
RUN apk add --no-cache gettext

# Remove default Nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the config template — entrypoint.sh will generate config.js from this
COPY --from=builder /app/dist/config.template.js /usr/share/nginx/html/config.template.js

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy and prepare the entrypoint script
COPY docker/entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

# Run entrypoint to inject env → config.js, then start Nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
