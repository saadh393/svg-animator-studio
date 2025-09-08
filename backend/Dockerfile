# syntax=docker/dockerfile:1.7

# --- Dependencies (production) ---
FROM node:20-slim AS backend_deps
WORKDIR /usr/src/app
ENV NODE_ENV=production \\
    PUPPETEER_SKIP_DOWNLOAD=true
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# --- Dependencies (development) ---
FROM node:20-slim AS backend_deps_dev
WORKDIR /usr/src/app
ENV NODE_ENV=development \\
    PUPPETEER_SKIP_DOWNLOAD=true
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# --- Production runtime ---
# Use Puppeteer's image which includes Chromium and all required libraries
FROM ghcr.io/puppeteer/puppeteer:22.11.1 AS backend_prod
WORKDIR /usr/src/app
ENV NODE_ENV=production \
    PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer

# Copy only compiled node_modules from deps stage
COPY --from=backend_deps /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://localhost:4000/health').then(r=>{if(r.ok) process.exit(0); else process.exit(1)}).catch(()=>process.exit(1))"
USER pptruser
CMD ["node", "src/index.js"]

# --- Development runtime ---
FROM ghcr.io/puppeteer/puppeteer:22.11.1 AS backend_dev
WORKDIR /usr/src/app
ENV NODE_ENV=development \
    PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer

COPY --from=backend_deps_dev /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

EXPOSE 4000
USER pptruser
CMD ["npm", "run", "dev"]
