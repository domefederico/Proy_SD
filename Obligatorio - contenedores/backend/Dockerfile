FROM node:20-alpine

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --production

# Copiar código fuente
COPY server.js ./
COPY config ./config/

# Exponer puerto
EXPOSE 3001

# Ejecutar servidor
CMD ["node", "server.js"]
