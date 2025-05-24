# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1

# --- Build Stage ---
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Install dependencies (use npm ci for deterministic builds)
COPY --link package.json package.json
# If you use a lock file, add it here (but do NOT copy lock files if not present)
# COPY --link package-lock.json package-lock.json

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy the rest of the app
COPY --link . .

# Build the frontend (Vite)
RUN npm run build

# Remove dev dependencies and install only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    rm -rf node_modules && npm ci --omit=dev

# --- Production Stage ---
FROM node:${NODE_VERSION}-slim AS final
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 paw && \
    adduser --system --uid 1001 --ingroup paw pawuser

# Copy built app and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
USER pawuser

EXPOSE 4173
CMD ["npm", "run", "serve"]
