FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:24-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 7110
CMD ["npm", "run", "dev"]

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Make INTERNAL_API_URL available at build time so Next.js rewrites are baked
# with the correct Docker service name instead of falling back to localhost.
ARG INTERNAL_API_URL=http://backend:7120
ENV INTERNAL_API_URL=${INTERNAL_API_URL}
RUN npm run build

FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
EXPOSE 7110
CMD ["npm", "start"]
