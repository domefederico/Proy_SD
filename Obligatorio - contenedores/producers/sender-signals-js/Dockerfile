FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY index.js ./
COPY config ./config/

CMD ["node", "index.js"]
