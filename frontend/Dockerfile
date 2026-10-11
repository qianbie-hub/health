# ==========================================
# Vigil Health Copilot - Production Frontend Dockerfile
# Multi-Stage Build: Node 22 build -> Nginx Alpine
# ==========================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy source code and build config
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: High Performance Nginx Server
FROM nginx:alpine AS runner

WORKDIR /usr/share/nginx/html

# Remove default nginx html
RUN rm -rf ./*

# Copy built artifacts from builder stage
COPY --from=builder /app/dist .

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
