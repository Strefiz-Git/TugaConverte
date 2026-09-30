# Imagem única com todos os binários de conversão.
FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    DATA_DIR=/data

# Os motores do site. poppler entra em vez de afrouxar a política do ImageMagick.
# p7zip-full dá o 7z, que junta as páginas de um PDF num ZIP.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      imagemagick \
      libreoffice-writer libreoffice-calc libreoffice-impress \
      pandoc \
      poppler-utils \
      p7zip-full \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
COPY public ./public

# Contentor sem privilégios e com um user sem home para o LibreOffice não se queixar.
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "src/server.js"]
