# ==========================================
# Multi-stage Dockerfile for chaserxhype-server
# ==========================================

# 1. Builder stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install system dependencies needed for native modules & Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy package and prisma configuration files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install dependencies without running postinstall scripts yet
RUN npm install --ignore-scripts

# Copy source code
COPY src ./src/

# Generate Prisma Client and compile TypeScript to dist/
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
RUN npx prisma generate
RUN npm run build

# 2. Production Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma runtime on Alpine
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=5000

# Copy compiled files and dependencies from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create uploads folder
RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["node", "dist/server.js"]
