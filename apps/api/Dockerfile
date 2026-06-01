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

# Skip tsc build — tsx transpiles at runtime
# RUN cd apps/api && pnpm build

EXPOSE 4000

CMD ["sh", "-c", "cd apps/api && npx tsx src/server.ts"]
