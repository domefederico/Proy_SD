# Sistema de Gestión de Contenedores de Basura

Sistema distribuido para la gestión inteligente de contenedores de basura utilizando arquitectura de microservicios con RabbitMQ, PostgreSQL y optimización de rutas.

---

## 🚀 Inicio Rápido

### 1. Levantar el sistema
```bash
docker compose up -d
```

### 2. Acceder a la aplicación
- **Aplicación Web**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (user: `user`, pass: `pass`)

### 3. Usar la aplicación
1. Abre http://localhost:3000
2. Presiona el botón **"Comenzar"**
3. Espera 10-15 segundos mientras se calcula la ruta
4. Navega por los contenedores con el botón **"Siguiente Contenedor"**
5. Al finalizar, presiona **"Finalizar Ruta"**

---

## 📖 Documentación

Para información detallada sobre la arquitectura, componentes y flujo del sistema, consulta:

### [📘 ARQUITECTURA.md](./ARQUITECTURA.md)

Este documento incluye:
- 🏛️ Diagrama de arquitectura completo
- ⚡ Flujo automático paso a paso
- 🟢 Componentes activos vs legacy
- 📨 Estructura de mensajes en colas
- 🔧 Guía de desarrollo
- 📊 Stack tecnológico

---

## 🎯 Características Principales

✅ **Flujo Automático**: Un solo clic inicia todo el proceso  
✅ **Selección Aleatoria**: Cada ejecución selecciona 8 contenedores diferentes  
✅ **Ruta Óptima**: Cálculo con algoritmos OR-Tools  
✅ **Mapa Interactivo**: Visualización en tiempo real con Leaflet  
✅ **Múltiples Ejecuciones**: Sin necesidad de reiniciar contenedores  
✅ **Persistencia de Datos**: RabbitMQ y PostgreSQL con volúmenes persistentes

---

## 🛠️ Comandos Útiles

### Ver logs
```bash
# Backend + Frontend
docker logs obligatorio-contenedores-app-1 -f

# Consumer de señales (Java)
docker logs obligatorio-contenedores-consumer-signals-1 -f

# Consumer de rutas (Python)
docker logs obligatorio-contenedores-consumer-full-containers-1 -f
```

### Consultar base de datos
```bash
docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c "SELECT id, porcentaje FROM contenedores ORDER BY porcentaje DESC;"
```

### Resetear contenedores a 0%
```bash
docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c "UPDATE contenedores SET porcentaje = 0;"
```

### Reconstruir aplicación
```bash
docker compose build app
docker compose up -d app
```

### Detener todo
```bash
docker compose down
```

### Eliminar volúmenes (reset completo)
```bash
docker compose down -v
```

**Nota**: Los volúmenes persisten datos de RabbitMQ y PostgreSQL entre reinicios. Usa `-v` solo si quieres eliminar todos los datos.

---

## 🏗️ Arquitectura Simplificada

```
Usuario → Frontend React → Backend Node.js → RabbitMQ → Consumers (Java/Python) → PostgreSQL
                              ↓                            ↓
                         Providers JS              Cálculo de Rutas
                                                           ↓
                                                     Mapa Interactivo
```

---

## 📦 Servicios Activos

| Servicio | Tecnología | Puerto | Función | Persistencia |
|----------|-----------|--------|---------|--------------|
| `app` | Node.js + React | 3000 | Frontend + Backend API | - |
| `consumer-signals` | Java 11+ | - | Procesa señales de sensores | - |
| `consumer-full-containers` | Python 3.9+ | - | Calcula rutas óptimas | - |
| `db` | PostgreSQL 15 | 5432 | Base de datos | ✅ Volume |
| `rabbitmq` | RabbitMQ 3 | 5672, 15672 | Message broker | ✅ Volume |

---

## 🔧 Desarrollo

### Modificar Backend
```bash
# Editar archivos en app/backend/
docker compose build app && docker compose up -d app
```

### Modificar Frontend
```bash
# Editar archivos en app/frontend/src/
docker compose build app && docker compose up -d app
```

---

## � Tecnologías

- **Frontend**: React 18 + Vite + Leaflet
- **Backend**: Node.js 20 + Express + amqplib + pg
- **Consumers**: Java (signals) + Python (routes/OR-Tools)
- **Infraestructura**: RabbitMQ + PostgreSQL + Docker

---

## 📝 Notas

- El sistema **garantiza 8 contenedores llenos** en cada ejecución
- Los contenedores se seleccionan **aleatoriamente** cada vez
- Soporta **múltiples ejecuciones** sin reiniciar
- El mapa es **fijo** (no se mueve automáticamente)

---

## 📄 Licencia

Este proyecto es parte de un trabajo académico.

│   │   │   ├── App.jsx       # Componente principal con mapa
│   │   │   └── components/   # ControlPanel, MapView
│   │   └── package.json
│   ├── Dockerfile            # Build unificado (frontend + backend)
│   ├── nginx.conf            # Configuración proxy reverso
│   └── supervisord.conf      # Gestión de procesos
├── common/                   # Código Java compartido
│   └── src/main/java/com/example/common/
│       ├── QueueNames.java   # Nombres de colas centralizados
│       └── RabbitConfig.java # Configuración de conexión RabbitMQ
├── consumers/
│   ├── consumer-signals/     # Consumer Java (signals → PostgreSQL)
│   ├── consumerFullContainers/   # Consumer Python (calcula rutas)
│   └── consumerContainersToClean/  # Consumer Python (muestra rutas)
├── producers/
│   ├── sender-signals/       # Producer Java (simula sensores)
│   └── providerFullContainers/  # Provider Java (consulta DB)
├── docker-compose.yml        # Orquestación de servicios
└── init.sql                  # Schema PostgreSQL
```

---

## 🛠️ Tecnologías Utilizadas

### Backend Services
- **Java 21** (Eclipse Temurin)
- **Maven 3.9.9**
- **RabbitMQ Java Client**
- **PostgreSQL JDBC Driver**

### Route Optimization
- **Python 3.11**
- **OR-Tools** (Google Optimization)
- **OpenRouteService API**
- **Pika** (RabbitMQ Python Client)

### Web Application
- **Node.js 20**
- **React 19** + **Vite 7**
- **Express.js 4.18**
- **Leaflet** (Mapas interactivos)
- **Nginx** (Web server + proxy)
- **Supervisor** (Process manager)

### Infrastructure
- **Docker** & **Docker Compose**
- **PostgreSQL 15**
- **RabbitMQ 3** (Management UI)

---

## 🚀 Configuración e Instalación

### Requisitos Previos
- Docker y Docker Compose instalados
- Conexión a Internet (para OpenRouteService API)

### Variables de Entorno

**RabbitMQ:**
- Usuario: `user`
- Password: `pass`
- Puerto broker: `5672`
- Puerto management UI: `15672`

**PostgreSQL:**
- Base de datos: `mi_base`
- Usuario: `postgres`
- Password: `1234`
- Puerto: `5432`

**Aplicación Web:**
- Puerto: `3000`
- API Backend: `http://localhost:3000/api`

---

## 🏃 Ejecución

### 1. Iniciar todos los servicios

```bash
cd "Obligatorio - contenedores"
docker compose up --build -d
```

### 2. Verificar servicios activos

```bash
docker compose ps
```

Deberías ver:
- `rabbitmq` (puertos 5672, 15672)
- `db` (puerto 5432)
- `app` (puerto 3000)
- `consumer-signals`
- `consumer-full-containers`
- `consumer-containers-to-clean`

### 3. Acceder a las interfaces

- **Aplicación Web**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (user: `user`, pass: `pass`)

### 4. Simular sensores y generar ruta

```bash
# Enviar datos de 15 contenedores
docker compose run --rm sender-signals

# Consultar y publicar contenedores llenos (≥75%)
docker compose run --rm provider-full-containers
```

### 5. Ver logs de los servicios

```bash
# Logs del consumer de signals
docker compose logs -f consumer-signals

# Logs del calculador de rutas
docker compose logs -f consumer-full-containers

# Logs de la aplicación web
docker compose logs -f app
```

---

## 📊 Monitoreo

### Ver mensajes en RabbitMQ
1. Ir a http://localhost:15672
2. Login: `user` / `pass`
3. Ver colas: `signals`, `fullcontainers`, `containerstoclean`

### Consultar base de datos
```bash
docker compose exec db psql -U postgres -d mi_base -c "SELECT * FROM contenedores;"
```

---

## 🧹 Limpieza

### Detener todos los servicios
```bash
docker compose down
```

### Eliminar volúmenes (resetear base de datos)
```bash
docker compose down -v
```

### Limpiar imágenes
```bash
docker compose down --rmi all
```

---

## 🔍 Características Técnicas

### Microservicios
- Arquitectura basada en eventos con RabbitMQ
- Separación de responsabilidades (sensores, storage, cálculo, visualización)
- Comunicación asíncrona entre servicios
- Contenedorización con Docker multi-stage builds

### Base de Datos
- PostgreSQL con `INSERT ON CONFLICT` para upserts
- Índice en columna `id` para búsquedas eficientes
- Inicialización automática con `init.sql`

### Optimización de Rutas
- Algoritmo de OR-Tools para optimización de rutas
- Integración con OpenRouteService para distancias reales
- Cálculo de ruta óptima con 16 puntos (depot + 15 contenedores)

### Aplicación Web
- SPA con React y enrutamiento del lado del cliente
- Polling cada 5 segundos para actualizar rutas
- Mapa interactivo con Leaflet/OpenStreetMap
- Navegación por contenedores con botón "Siguiente"
- Proxy reverso con Nginx para APIs
- Supervisor para gestión de múltiples procesos en un contenedor

---

## 🐛 Troubleshooting

### Problema: Puerto 3000 ocupado
```bash
# Detener el servicio que usa el puerto
docker compose down
lsof -ti:3000 | xargs kill -9
docker compose up -d app
```

### Problema: No aparecen rutas en el frontend
```bash
# Verificar que se publicaron mensajes
docker compose logs consumer-full-containers

# Verificar que el backend recibe mensajes
docker compose logs app | grep "ruta recibida"

# Regenerar ruta
docker compose run --rm sender-signals
docker compose run --rm provider-full-containers
```

### Problema: Error de conexión a RabbitMQ
```bash
# Verificar que RabbitMQ está corriendo
docker compose ps rabbitmq

# Reiniciar RabbitMQ
docker compose restart rabbitmq

# Esperar 10 segundos y reiniciar consumidores
docker compose restart consumer-signals consumer-full-containers consumer-containers-to-clean app
```

### Problema: Error en el build de Maven
```bash
# Limpiar caché de Maven y reconstruir
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 📝 Notas de Desarrollo

### Patrones de Diseño Utilizados
- **Producer-Consumer**: Para comunicación asíncrona
- **Repository Pattern**: Acceso a base de datos
- **Multi-stage Docker builds**: Optimización de imágenes
- **API Gateway Pattern**: Nginx como proxy reverso

### Consideraciones de Confiabilidad
- Uso de `INSERT ON CONFLICT` para evitar duplicados
- Auto-reinicio de servicios con Docker restart policies
- Gestión de procesos con Supervisor
- Logs centralizados con Docker logging

---

## 🚀 Mejoras Futuras

- [ ] Autenticación y autorización en el frontend
- [ ] WebSockets para actualizaciones en tiempo real (sin polling)
- [ ] Colas durables y mensajes persistentes en RabbitMQ
- [ ] Métricas y monitoreo con Prometheus/Grafana
- [ ] Tests unitarios e integración
- [ ] CI/CD con GitHub Actions
- [ ] Configuración mediante variables de entorno
- [ ] Soporte multi-tenant para múltiples ciudades
- [ ] Historial de rutas calculadas
- [ ] Notificaciones push para conductores

---

## 👥 Contribución

Este proyecto fue desarrollado como parte del Obligatorio de Sistemas Distribuidos.

---

## 📄 Licencia

Este proyecto es de uso académico.
