# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app

# Install system dependencies for native modules (faiss-node, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      python3 \
      python3-pip \
      git \
      ca-certificates \
      libgomp1 \
      libstdc++6 \
      && rm -rf /var/lib/apt/lists/*

# Install dependencies separately to leverage Docker cache
COPY --link package.json ./
COPY --link package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --production

# Copy application source code
COPY --link . .

# Remove test, migration, and contract artifacts from production image
RUN rm -rf tests migrations contracts hardhat.config.js cache artifacts

# Create non-root user
RUN groupadd -r paw && useradd -m -g paw pawuser

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

USER pawuser

EXPOSE 4000

CMD ["npm", "start"]
