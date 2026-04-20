FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/core ./packages/core
COPY apps/api ./apps/api

# Build
RUN pnpm --filter=@resume-llm/core build
RUN pnpm --filter=@resume-llm/api build

EXPOSE 8787
CMD ["node", "apps/api/dist/index.js"]
