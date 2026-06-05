FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=/api/ramz
ARG NEXT_PUBLIC_PREDICTION_SERVICE_URL=/api/prediction
ARG NEXT_PUBLIC_PREDICTION_WS_URL=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_PREDICTION_SERVICE_URL=$NEXT_PUBLIC_PREDICTION_SERVICE_URL
ENV NEXT_PUBLIC_PREDICTION_WS_URL=$NEXT_PUBLIC_PREDICTION_WS_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_PUBLIC_API_BASE_URL=/api/ramz
ENV NEXT_PUBLIC_PREDICTION_SERVICE_URL=/api/prediction
ENV NEXT_PUBLIC_PREDICTION_WS_URL=

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
