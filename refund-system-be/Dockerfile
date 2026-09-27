# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (TypeScript, Prisma CLI, tsx needed for build + seed)
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Also install tsx for running the seed at startup
RUN npm install tsx

# Copy Prisma client (generated in builder)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy schema, config, seed
COPY prisma ./prisma
COPY prisma.config.ts ./

# Copy compiled API
COPY --from=builder /app/dist ./dist

# Entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
CMD ["./docker-entrypoint.sh"]
