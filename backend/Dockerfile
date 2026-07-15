# ── Stage 1: install production dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# --omit=dev ensures devDependencies are not installed in the final image
RUN npm ci --omit=dev

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user. Running as root inside a container is a significant
# risk — if the app is compromised, the attacker has root inside the container.
RUN addgroup -S bazaar && adduser -S bazaar -G bazaar

# Copy only the production node_modules and application source
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

# Drop privileges before starting the process
USER bazaar

EXPOSE 5000

CMD ["node", "src/server.js"]
