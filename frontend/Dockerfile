# ── Stage 1: build the Vite app ───────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# Vite reads VITE_* vars at build time — pass them as build args if needed
RUN npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove the default nginx config and replace with our own
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# nginx drops to the 'nginx' user by itself after binding port 80,
# but we lock down permissions on the html directory explicitly
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
