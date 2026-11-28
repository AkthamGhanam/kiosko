# Imagen para publicar el kiosko (Railway, Render, Fly.io o cualquier servidor con Docker).
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
# La base SQLite vive en /data: monta ahí un volumen para que el inventario no se pierda al redesplegar.
ENV NODE_ENV=production DATABASE_URL=file:/data/kiosko.db
RUN mkdir -p /data
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npx next start -p ${PORT:-3000}"]
