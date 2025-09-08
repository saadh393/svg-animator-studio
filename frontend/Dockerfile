# syntax=docker/dockerfile:1.7

# --- Build stage ---
FROM node:20-alpine AS frontend_build
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

# --- Production runtime ---
FROM nginx:1.27-alpine AS frontend_prod
COPY --from=frontend_build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]

# --- Development runtime ---
FROM node:20-alpine AS frontend_dev
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

