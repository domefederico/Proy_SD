# Multi-stage build: Frontend + Backend en un solo contenedor

# ============================================
# STAGE 1: Build del Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY app/frontend/package*.json ./
RUN npm install

COPY app/frontend/ ./
RUN npm run build

# ============================================
# STAGE 2: Preparar Backend
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY app/backend/package*.json ./
RUN npm install --production

COPY app/backend/ ./

# ============================================
# STAGE 3: Imagen final con Nginx + Node
# ============================================
FROM node:20-alpine

# Instalar Nginx y supervisor (para manejar múltiples procesos)
RUN apk add --no-cache nginx supervisor

# Crear directorio para Nginx
RUN mkdir -p /run/nginx

# Copiar el frontend buildado a Nginx
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copiar el backend
WORKDIR /app/backend
COPY --from=backend-builder /app/backend ./

# Copiar configuración de Nginx
COPY app/nginx.conf /etc/nginx/http.d/default.conf

# Copiar configuración de Supervisor
COPY app/supervisord.conf /etc/supervisord.conf

# Exponer puerto 80 (Nginx)
EXPOSE 80

# Iniciar supervisor (maneja Nginx + Node.js)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
