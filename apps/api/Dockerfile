FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages needed by the API
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

EXPOSE 4000

# Start with tsx
CMD ["node", "--import", "tsx", "apps/api/src/server.ts"]
