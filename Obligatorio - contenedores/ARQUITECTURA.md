# 🏗️ Arquitectura del Sistema - Gestión de Contenedores

## 📋 Tabla de Contenidos
- [Visión General](#visión-general)
- [Arquitectura Actual](#arquitectura-actual)
- [Flujo Automático](#flujo-automático)
- [Componentes Activos](#componentes-activos)
- [Componentes Legacy](#componentes-legacy)
- [Colas de RabbitMQ](#colas-de-rabbitmq)
- [Inicio Rápido](#inicio-rápido)

---

## 🎯 Visión General

Sistema distribuido para la gestión inteligente de contenedores de basura con:
- ✅ Simulación de sensores IoT
- ✅ Cálculo automático de rutas óptimas
- ✅ Visualización en tiempo real con mapa interactivo
- ✅ Arquitectura de microservicios con RabbitMQ

---

## 🏛️ Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUJO AUTOMÁTICO                             │
└─────────────────────────────────────────────────────────────────────┘

    Usuario presiona "Comenzar" en Frontend
                    ↓
    ┌──────────────────────────────────────┐
    │   Backend Node.js (app/backend/)     │
    │   Puerto: 4000                       │
    └──────────────────────────────────────┘
                    ↓
    ┌──────────────────────────────────────┐
    │  PASO 1: ejecutarSenderSignals()     │
    │  - Consulta 15 contenedores de BD    │
    │  - Selecciona 8 aleatorios           │
    │  - Fuerza porcentaje >= 75%          │
    │  - Publica a cola "signals"          │
    └──────────────────────────────────────┘
                    ↓
          Cola RabbitMQ: "signals"
                    ↓
    ┌──────────────────────────────────────┐
    │  Consumer-Signals (Java)             │
    │  - Recibe mensajes                   │
    │  - Actualiza BD (INSERT ON CONFLICT) │
    └──────────────────────────────────────┘
                    ↓
              PostgreSQL
                    ↓
    ┌──────────────────────────────────────┐
    │  PASO 2: ejecutarProviderFull...()   │
    │  - Consulta contenedores >= 75%      │
    │  - Publica cada uno a cola           │
    │  - Envía señal -1 (trigger cálculo)  │
    └──────────────────────────────────────┘
                    ↓
        Cola RabbitMQ: "fullcontainers"
                    ↓
    ┌──────────────────────────────────────┐
    │  Consumer-Full-Containers (Python)   │
    │  - Recibe contenedores llenos        │
    │  - Calcula ruta óptima (OR-Tools)    │
    │  - Publica ruta a cola               │
    └──────────────────────────────────────┘
                    ↓
      Cola RabbitMQ: "containerstoclean"
                    ↓
    ┌──────────────────────────────────────┐
    │  Backend: routeConsumer.js           │
    │  - Escucha cola en segundo plano     │
    │  - Actualiza variable ultimaRuta     │
    └──────────────────────────────────────┘
                    ↓
    ┌──────────────────────────────────────┐
    │  Frontend React                      │
    │  - Muestra mapa con ruta             │
    │  - Navegación por contenedores       │
    │  - Botón "Finalizar Ruta"            │
    └──────────────────────────────────────┘
```

---

## ⚡ Flujo Automático

### Inicio del Flujo
1. Usuario abre http://localhost:3000
2. Presiona botón **"Comenzar"** en WelcomeScreen
3. Frontend hace POST a `/api/iniciar-flujo`
4. Backend ejecuta todo el proceso automáticamente

### Proceso Completo (≈15 segundos)
```bash
[0s]   POST /api/iniciar-flujo recibido
[0s]   ↓ Ejecutando senderSignals.js
[1s]   ✓ 15 sensores procesados (8 contenedores forzados a >= 75%)
[1s]   ↓ Esperando 5 segundos para procesamiento...
[6s]   ↓ Ejecutando providerFullContainers.js
[7s]   ✓ 8 contenedores enviados a cola + señal -1
[7s]   ↓ Esperando cálculo de ruta (máx 30s)...
[12s]  ✓ Ruta recibida desde Python consumer
[12s]  ✓ Respuesta JSON enviada al frontend
[13s]  ✓ Mapa mostrado con 8 contenedores
```

### Navegación de Ruta
- **Botón "Siguiente Contenedor"**: Avanza al siguiente punto
- **Mapa fijo**: No se mueve automáticamente (usuario controla zoom/scroll)
- **Marcadores visuales**:
  - 🟢 Verde = Contenedor actual
  - 🔵 Azul = Pendientes
  - ⚪ Gris = Ya recogidos

### Finalizar Ruta
1. Usuario llega al último contenedor
2. Presiona botón **"Finalizar Ruta"**
3. Backend hace POST a `/api/ruta/completar`
4. Actualiza BD: `UPDATE contenedores SET porcentaje = 0`
5. Vuelve a WelcomeScreen para nueva ejecución

---

## 🟢 Componentes Activos

### 1. app (Backend + Frontend)
**Contenedor:** `obligatorio-contenedores-app-1`  
**Puerto:** 3000 (HTTP), 4000 (API interna)

#### Backend Node.js
```
app/backend/
├── server.js                    # API REST principal
├── config/
│   ├── database.js              # Config PostgreSQL
│   └── rabbitmq.js              # Config RabbitMQ + nombres de colas
├── providers/
│   ├── senderSignals.js         # Simula 15 sensores (reemplaza Java)
│   └── providerFullContainers.js # Publica contenedores llenos (reemplaza Java)
└── services/
    └── routeConsumer.js         # Escucha cola "containerstoclean"
```

**Endpoints:**
- `POST /api/iniciar-flujo` - Inicia todo el proceso automático
- `GET /api/ruta` - Obtiene la última ruta calculada
- `POST /api/ruta/completar` - Vacía contenedores y finaliza ruta
- `GET /api/health` - Health check

#### Frontend React
```
app/frontend/src/
├── App.jsx                      # Lógica principal + estado
├── components/
│   ├── WelcomeScreen.jsx        # Pantalla inicial con botón "Comenzar"
│   ├── MapView.jsx              # Mapa Leaflet con marcadores
│   └── ControlPanel.jsx         # Botones "Siguiente" y "Finalizar"
└── main.jsx
```

### 2. consumer-signals (Java)
**Contenedor:** `obligatorio-contenedores-consumer-signals-1`  
**Cola:** `signals`

**Función:**
- Escucha mensajes de sensores: `{id, latitud, longitud, porcentaje}`
- Inserta/actualiza en PostgreSQL usando `INSERT ON CONFLICT`
- Corre permanentemente

### 3. consumer-full-containers (Python)
**Contenedor:** `obligatorio-contenedores-consumer-full-containers-1`  
**Cola:** `fullcontainers`

**Función:**
- Recibe contenedores llenos (>= 75%)
- Espera señal `-1` para calcular ruta
- Usa OR-Tools para optimización
- Publica ruta a cola `containerstoclean`
- Se resetea automáticamente para nueva ejecución

### 4. db (PostgreSQL)
**Contenedor:** `obligatorio-contenedores-db-1`  
**Puerto:** 5432  
**Base de datos:** `mi_base`  
**Persistencia:** ✅ Volumen `./init.sql` inicializa la tabla

**Tabla:**
```sql
CREATE TABLE contenedores (
    id SERIAL PRIMARY KEY,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    porcentaje INTEGER NOT NULL
);
```

### 5. rabbitmq
**Contenedor:** `obligatorio-contenedores-rabbitmq-1`  
**Puertos:** 5672 (AMQP), 15672 (Management UI)  
**Credenciales:** `user` / `pass`  
**Persistencia:** ✅ Volumen `rabbitmq_data` para mensajes y configuración

**Ventajas de la persistencia:**
- Los mensajes sobreviven a reinicios del contenedor
- Las colas declaradas se mantienen
- Útil para debugging y análisis de flujo

---

## 🔴 Componentes Legacy (No Activos)

Estos componentes existen en el código pero **NO se ejecutan** en el flujo automático:

### ❌ producers/sender-signals/ (Java)
- **Estado:** Definido en docker-compose, no corre
- **Reemplazado por:** `app/backend/providers/senderSignals.js`
- **Uso original:** Flujo manual con `docker compose run --rm sender-signals`

### ❌ producers/providerFullContainers/ (Java)
- **Estado:** Definido en docker-compose, no corre
- **Reemplazado por:** `app/backend/providers/providerFullContainers.js`
- **Uso original:** Flujo manual con `docker compose run --rm provider-full-containers`

### ❌ consumers/consumerContainersToClean/ (Python)
- **Estado:** NO definido en docker-compose
- **Reemplazado por:** `app/backend/services/routeConsumer.js`
- **Razón:** El backend escucha directamente la cola

### ❌ common/ (Configuración Java compartida)
- **Estado:** Solo usada por producers Java que no corren
- **Mantener:** Por si se quiere usar flujo manual

---

## 📨 Colas de RabbitMQ

### 1. signals
- **Publisher:** `app/backend/providers/senderSignals.js`
- **Consumer:** `consumer-signals` (Java)
- **Mensaje:**
```json
{
  "id": 1,
  "latitud": -34.9011,
  "longitud": -56.1645,
  "porcentaje": 87
}
```

### 2. fullcontainers
- **Publisher:** `app/backend/providers/providerFullContainers.js`
- **Consumer:** `consumer-full-containers` (Python)
- **Mensajes:**
```json
// Contenedor lleno
{
  "id": 3,
  "latitud": -34.8814,
  "longitud": -56.1630,
  "porcentaje": 91
}

// Señal de cálculo
{"id": -1}
```

### 3. containerstoclean
- **Publisher:** `consumer-full-containers` (Python)
- **Consumer:** `app/backend/services/routeConsumer.js`
- **Mensaje:**
```json
{
  "ruta": [
    {"id": 1, "latitud": -34.9177, "longitud": -56.1602, "porcentaje": 83},
    {"id": 7, "latitud": -34.9038, "longitud": -56.1646, "porcentaje": 81},
    ...
  ],
  "cantidad_contenedores": 8,
  "tiempo_total_minutos": 30.8,
  "tiempo_total_segundos": 1848
}
```

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Docker Desktop
- Docker Compose

### Levantar el Sistema
```bash
cd "Obligatorio - contenedores"
docker compose up -d
```

**Servicios que inician:**
- ✅ rabbitmq (puerto 5672, 15672) - **Con volumen persistente**
- ✅ db (puerto 5432) - **Con volumen persistente**
- ✅ consumer-signals (escuchando cola)
- ✅ consumer-full-containers (escuchando cola)
- ✅ app (frontend + backend, puerto 3000)

**Nota sobre persistencia:**
- RabbitMQ: Los mensajes y colas persisten entre reinicios
- PostgreSQL: Los datos de contenedores persisten entre reinicios
- Para reset completo: `docker compose down -v` (elimina volúmenes)

### Usar la Aplicación
1. Abrir navegador: http://localhost:3000
2. Presionar botón **"Comenzar"**
3. Esperar 10-15 segundos
4. Ver mapa con ruta calculada
5. Navegar por contenedores con botón **"Siguiente"**
6. Al finalizar, presionar **"Finalizar Ruta"**

### Monitoreo

#### Ver Colas en RabbitMQ
```
URL: http://localhost:15672
User: user
Pass: pass
```

#### Ver Logs
```bash
# Backend
docker logs obligatorio-contenedores-app-1 -f

# Consumer signals (Java)
docker logs obligatorio-contenedores-consumer-signals-1 -f

# Consumer full containers (Python)
docker logs obligatorio-contenedores-consumer-full-containers-1 -f
```

#### Consultar Base de Datos
```bash
docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base

# Ver contenedores
SELECT id, porcentaje FROM contenedores ORDER BY porcentaje DESC;
```

### Detener el Sistema
```bash
docker compose down
```

---

## 🔧 Desarrollo

### Modificar Backend
```bash
cd app/backend
# Editar archivos en providers/, services/, etc.

# Reconstruir
cd ../..
docker compose build app
docker compose up -d app
```

### Modificar Frontend
```bash
cd app/frontend
# Editar archivos en src/

# Reconstruir
cd ../..
docker compose build app
docker compose up -d app
```

### Resetear Contenedores a 0%
```bash
docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c "UPDATE contenedores SET porcentaje = 0;"
```

---

## 📊 Tecnologías Utilizadas

### Backend
- **Node.js 20** - Runtime
- **Express 4.18** - Framework web
- **amqplib 0.10** - Cliente RabbitMQ
- **pg 8.11** - Cliente PostgreSQL
- **Supervisor** - Gestor de procesos

### Frontend
- **React 18** - Framework UI
- **Vite** - Build tool
- **Leaflet** - Mapas interactivos
- **react-leaflet** - Componentes React para Leaflet

### Consumers
- **Java 11+** - consumer-signals
- **Python 3.9+** - consumer-full-containers
- **OR-Tools** - Optimización de rutas

### Infraestructura
- **RabbitMQ 3** - Message broker
- **PostgreSQL 15** - Base de datos
- **Nginx** - Web server + reverse proxy
- **Docker** - Containerización

---

## 📝 Notas Adicionales

### Selección Aleatoria de Contenedores
El sistema **garantiza** que en cada ejecución:
- Se seleccionan **8 contenedores aleatorios** de los 15 disponibles
- Estos 8 se fuerzan a tener porcentaje **>= 75%**
- Los demás tienen incremento aleatorio normal (1-5%)

Esto hace que cada ruta sea **diferente** y simula comportamiento real.

### Ejecuciones Múltiples
El sistema soporta **múltiples ejecuciones** sin reiniciar contenedores:
- Al finalizar una ruta, los contenedores se vacían (porcentaje = 0)
- La siguiente ejecución selecciona nuevos contenedores aleatorios
- El consumer Python se resetea automáticamente

### Manejo de Errores
- Si no hay contenedores >= 75%, el sistema espera hasta timeout (30s)
- Si hay error en BD o RabbitMQ, se muestra mensaje al usuario
- Todos los errores se registran en logs

---

## 🤝 Contribuir

Para agregar nuevas funcionalidades:
1. Modificar código en `app/backend/` o `app/frontend/`
2. Reconstruir contenedor `app`
3. Probar flujo completo
4. Actualizar esta documentación

---

## 📄 Licencia

Este proyecto es parte de un trabajo académico.
