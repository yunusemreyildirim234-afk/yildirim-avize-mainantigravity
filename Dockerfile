# 1. Aşama: Derleme
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
# `postinstall` => prisma generate; şema npm install'dan önce mevcut olmalı
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

# 2. Aşama: Çalıştırma
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
# Şema değişikliklerini uygula, sonra sunucuyu başlat
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]