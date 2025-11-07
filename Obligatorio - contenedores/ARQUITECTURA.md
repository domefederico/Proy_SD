# 🏗️ Arquitectura del Sistema EmptyTrash

## 📋 Tabla de Contenidos
- [Visión General](#-visión-general)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Flujo de Datos Detallado](#-flujo-de-datos-detallado)
- [Componentes del Sistema](#-componentes-del-sistema)
- [Comunicación Entre Servicios](#-comunicación-entre-servicios)
- [Base de Datos](#-base-de-datos)
- [Colas de RabbitMQ](#-colas-de-rabbitmq)
- [Decisiones de Diseño](#-decisiones-de-diseño)

---

## 🎯 Visión General

**EmptyTrash** es un sistema distribuido de gestión inteligente de contenedores de basura que combina:

- 🤖 **Simulación IoT**: Generación automática de datos de sensores cada 30 segundos
- 🗺️ **Optimización de Rutas**: Cálculo de rutas óptimas usando Google OR-Tools
- 📊 **Visualización en Tiempo Real**: Interfaz web interactiva con mapas Leaflet
- 🔄 **Arquitectura de Microservicios**: Servicios desacoplados comunicados vía RabbitMQ
- 💾 **Persistencia**: PostgreSQL para datos y RabbitMQ para mensajería

---

## 🏛️ Arquitectura del Sistema

### Diagrama de Alto Nivel

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          EMPTYTRASH SYSTEM                                │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   NAVEGADOR     │
│  (localhost:    │ ← HTTP → ┌────────────────────┐
│     3000)       │          │    Nginx Proxy     │
└─────────────────┘          │   (Frontend)       │
                             └──────────┬─────────┘
                                        │
                                        │ Sirve
                                        ↓
                             ┌────────────────────┐
                             │  React + Vite      │
                             │  + Leaflet Maps    │
                             └──────────┬─────────┘
                                        │
                                        │ API Calls
                                        │ (/api/*)
                                        ↓
                             ┌────────────────────┐
                             │  Backend API       │
                             │  Node.js Express   │
                             │  (Puerto 3001)     │
                             └──────┬─────┬───────┘
                                    │     │
                    ┌───────────────┘     └──────────────┐
                    ↓                                     ↓
         ┌──────────────────┐                  ┌─────────────────┐
         │   PostgreSQL     │                  │   RabbitMQ      │
         │   (mi_base)      │                  │  Message Broker │
         │  Puerto 5432     │                  │  Puerto 5672    │
         └──────────────────┘                  └────────┬────────┘
                 ↑                                      │
                 │                         ┌────────────┼────────────┐
                 │                         │            │            │
                 │                         ↓            ↓            ↓
                 │              ┌───────────────┐ ┌──────────┐ ┌─────────┐
                 │              │ sender-signals│ │ provider-│ │consumers│
                 │              │   (Node.js)   │ │   full   │ │ (Java + │
                 │              │ Auto cada 30s │ │containers│ │ Python) │
                 │              └───────────────┘ │(Node.js) │ └─────────┘
                 │                                └──────────┘
                 │                                      │
                 └──────────────────────────────────────┘
                           Actualiza datos
```

### Arquitectura de Microservicios

El sistema está compuesto por **8 servicios independientes**:

| # | Servicio | Tipo | Lenguaje | Función Principal |
|---|----------|------|----------|-------------------|
| 1 | **frontend** | Web UI | React | Interfaz de usuario |
| 2 | **backend** | API REST | Node.js | Orquestación y lógica de negocio |
| 3 | **sender-signals** | Producer | Node.js | Generador automático de sensores IoT |
| 4 | **provider-full-containers** | Producer | Node.js | Consulta y publica contenedores llenos |
| 5 | **consumer-signals** | Consumer | Java | Procesa señales y actualiza DB |
| 6 | **consumer-full-containers** | Consumer | Python | Calcula rutas óptimas (OR-Tools) |
| 7 | **rabbitmq** | Message Broker | Erlang | Comunicación asíncrona |
| 8 | **db** | Database | PostgreSQL | Persistencia de datos |

---

## 🔄 Flujo de Datos Detallado

### Fase 1: Generación Automática de Datos (Continua)

```
┌─────────────────────────────────────────────────────────────────┐
│  CADA 30 SEGUNDOS (Automático)                                  │
└─────────────────────────────────────────────────────────────────┘

  [T+0s]  sender-signals ejecuta
           ↓
  [T+0s]  Selecciona 8-15 contenedores aleatorios
           ↓
  [T+0s]  Genera porcentajes:
           • Seleccionados: 75-100%
           • No seleccionados: 0-74%
           ↓
  [T+1s]  Publica 15 mensajes → Cola "signals"
           ↓
           ┌──────────────────────────────┐
           │  Queue: signals              │
           │  Messages: 15 contenedores   │
           └──────────┬───────────────────┘
                      ↓
  [T+1s]  consumer-signals (Java) procesa
           ↓
  [T+2s]  Ejecuta: INSERT INTO contenedores ... ON CONFLICT UPDATE
           ↓
           ┌──────────────────────────────┐
           │  PostgreSQL: contenedores    │
           │  15 filas actualizadas       │
           └──────────────────────────────┘

  [T+30s] ⟲ Repite el ciclo
```

### Fase 2: Cálculo de Ruta (Disparado por Usuario)

```
┌─────────────────────────────────────────────────────────────────┐
│  Usuario presiona "Comenzar Ruta" en Frontend                   │
└─────────────────────────────────────────────────────────────────┘

  [0s]  Frontend → POST /api/iniciar-flujo
         ↓
  [0s]  Backend recibe petición
         ↓
  [0s]  Backend → POST http://provider-full-containers:3003/consultar-contenedores
         ↓
  [1s]  provider-full-containers:
         ├─ Query: SELECT * FROM contenedores WHERE porcentaje >= 75
         ├─ Encuentra N contenedores (N >= 8)
         ├─ Publica cada contenedor → Cola "fullcontainers"
         └─ Publica señal final: {id: -1, timestamp: ...}
         ↓
         ┌────────────────────────────────────┐
         │  Queue: fullcontainers             │
         │  Messages: N + 1 (señal -1)        │
         └──────────┬─────────────────────────┘
                    ↓
  [2s]  consumer-full-containers (Python):
         ├─ Recibe N contenedores
         ├─ Almacena en memoria: contenedores_llenos = []
         ├─ Al recibir id=-1:
         │   ├─ Calcula ruta con OR-Tools (VRP)
         │   ├─ Optimiza distancias y tiempos
         │   └─ Genera JSON con ruta ordenada
         └─ Guarda en DB: INSERT INTO rutas (ruta, cantidad, tiempo, fecha)
         ↓
         ┌────────────────────────────────────┐
         │  PostgreSQL: rutas                 │
         │  Nueva fila con ruta calculada     │
         └──────────┬─────────────────────────┘
                    ↓
  [5s]  Backend (polling cada 500ms):
         ├─ Query: SELECT * FROM rutas WHERE fecha_calculo >= tiempoInicio
         ├─ Encuentra nueva ruta
         └─ Retorna ruta completa al Frontend
         ↓
  [6s]  Frontend:
         ├─ Recibe JSON con ruta
         ├─ Renderiza mapa Leaflet
         ├─ Muestra N contenedores
         └─ Habilita navegación
```

### Fase 3: Finalización de Ruta

```
┌─────────────────────────────────────────────────────────────────┐
│  Usuario presiona "Finalizar Ruta" en Frontend                  │
└─────────────────────────────────────────────────────────────────┘

  [0s]  Frontend → POST /api/ruta/completar
         ↓
  [0s]  Backend:
         ├─ Extrae IDs de contenedores de la ruta
         └─ UPDATE contenedores SET porcentaje = 0 WHERE id IN (...)
         ↓
         ┌────────────────────────────────────┐
         │  PostgreSQL: contenedores          │
         │  N contenedores vaciados (0%)      │
         └────────────────────────────────────┘
         ↓
  [1s]  Frontend vuelve a WelcomeScreen
         ↓
  [30s] ⟲ sender-signals genera nuevos datos
```

---

## 🔧 Componentes del Sistema

### 1. Frontend (React + Vite)

**Ubicación:** `frontend/`  
**Imagen Docker:** Nginx Alpine  
**Puerto:** 3000

**Responsabilidades:**
- Renderizar interfaz de usuario
- Mostrar mapa interactivo con Leaflet
- Gestionar navegación entre contenedores
- Comunicarse con Backend API vía HTTP

**Componentes Clave:**
```
src/
├── App.jsx                  # Estado global y lógica de flujo
├── components/
│   ├── WelcomeScreen.jsx   # Pantalla inicial con botón "Comenzar"
│   ├── MapView.jsx         # Mapa Leaflet con marcadores
│   └── ControlPanel.jsx    # Botones de navegación
└── main.jsx
```

**Endpoints que consume:**
- `POST /api/iniciar-flujo` - Inicia el proceso completo
- `GET /api/ruta` - Obtiene ruta calculada (solo si necesita)
- `POST /api/ruta/completar` - Finaliza y vacía contenedores

---

### 2. Backend (Node.js + Express)

**Ubicación:** `backend/`  
**Imagen Docker:** Node.js 20 Alpine  
**Puerto:** 3001

**Responsabilidades:**
- Orquestar el flujo completo
- Actuar como API Gateway
- Comunicarse con provider-full-containers
- Hacer polling a PostgreSQL
- Gestionar estado de rutas

**Estructura:**
```
backend/
├── server.js               # API REST principal
├── config/
│   ├── database.js        # Pool de conexiones PostgreSQL
│   └── rabbitmq.js        # (No usado directamente)
└── package.json
```

**Endpoints principales:**
```javascript
POST /api/iniciar-flujo
  ├─ Llama a provider-full-containers HTTP
  ├─ Espera ruta en DB (polling)
  └─ Retorna ruta completa

GET /api/ruta
  └─ Retorna última ruta calculada desde DB

POST /api/ruta/completar
  ├─ Recibe IDs de contenedores
  └─ UPDATE ... SET porcentaje = 0
```

---

### 3. sender-signals (Node.js Producer)

**Ubicación:** `producers/sender-signals-js/`  
**Imagen Docker:** Node.js 20 Alpine  
**Ejecución:** Automática cada 30 segundos

**Responsabilidades:**
- Simular sensores IoT en tiempo real
- Generar datos de 15 contenedores
- Seleccionar aleatoriamente 8-15 para llenar
- Publicar a cola RabbitMQ

**Algoritmo:**
```javascript
setInterval(() => {
  // 1. Seleccionar 8-15 contenedores aleatorios
  const cantidadALlenar = Math.floor(Math.random() * 8) + 8;
  
  // 2. Fisher-Yates shuffle para selección sin repetición
  const indicesALlenar = shuffleArray([0,1,2,...,14]).slice(0, cantidadALlenar);
  
  // 3. Generar porcentajes
  contenedores.forEach((c, i) => {
    if (indicesALlenar.includes(i)) {
      c.porcentaje = Math.floor(Math.random() * 26) + 75; // 75-100%
    } else {
      c.porcentaje = Math.floor(Math.random() * 75); // 0-74%
    }
  });
  
  // 4. Publicar a RabbitMQ
  contenedores.forEach(c => {
    channel.sendToQueue('signals', Buffer.from(JSON.stringify(c)));
  });
}, 30000);
```

**Coordenadas Fijas:**
```javascript
const contenedores = [
  { id: 1,  latitud: -34.9065, longitud: -56.2040 },
  { id: 2,  latitud: -34.9060, longitud: -56.1860 },
  // ... 15 ubicaciones en Montevideo
];
```

---

### 4. provider-full-containers (Node.js HTTP Server)

**Ubicación:** `producers/provider-full-containers-js/`  
**Imagen Docker:** Node.js 20 Alpine  
**Puerto:** 3003

**Responsabilidades:**
- Exponer HTTP endpoint `/consultar-contenedores`
- Consultar PostgreSQL por contenedores >= 75%
- Publicar a RabbitMQ
- Detectar cuando no hay contenedores llenos

**Endpoint:**
```javascript
POST /consultar-contenedores
  ├─ Query: SELECT * FROM contenedores WHERE porcentaje >= 75
  ├─ Si no hay resultados:
  │   └─ Retorna: {hasContainers: false, count: 0}
  ├─ Si hay resultados:
  │   ├─ Publica cada contenedor a 'fullcontainers'
  │   ├─ Publica señal: {id: -1, timestamp: ...}
  │   └─ Retorna: {hasContainers: true, count: N}
```

---

### 5. consumer-signals (Java Consumer)

**Ubicación:** `consumers/consumer-signals/`  
**Imagen Docker:** Eclipse Temurin 11 Alpine  
**Cola:** `signals`

**Responsabilidades:**
- Procesar señales de sensores
- Actualizar PostgreSQL con UPSERT
- Correr indefinidamente

**Lógica:**
```java
@RabbitListener(queues = "signals")
public void processSensorData(String message) {
    SensorData data = parseJson(message);
    
    // UPSERT: Insertar o actualizar si existe
    String sql = "INSERT INTO contenedores (id, latitud, longitud, porcentaje) " +
                 "VALUES (?, ?, ?, ?) " +
                 "ON CONFLICT (id) DO UPDATE SET " +
                 "latitud = EXCLUDED.latitud, " +
                 "longitud = EXCLUDED.longitud, " +
                 "porcentaje = EXCLUDED.porcentaje";
    
    jdbcTemplate.update(sql, data.id, data.latitud, data.longitud, data.porcentaje);
}
```

---

### 6. consumer-full-containers (Python Consumer)

**Ubicación:** `consumers/consumerFullContainers/`  
**Imagen Docker:** Python 3.9 Slim  
**Cola:** `fullcontainers`

**Responsabilidades:**
- Recibir contenedores llenos
- Calcular ruta óptima con OR-Tools
- Guardar ruta en PostgreSQL

**Algoritmo OR-Tools (VRP):**
```python
def calculate_route(containers):
    # 1. Crear matriz de distancias (Haversine)
    distance_matrix = compute_distances(containers)
    
    # 2. Configurar modelo OR-Tools
    manager = pywrapcp.RoutingIndexManager(len(containers), 1, 0)
    routing = pywrapcp.RoutingModel(manager)
    
    # 3. Registrar callback de distancia
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]
    
    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    
    # 4. Resolver
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    solution = routing.SolveWithParameters(search_parameters)
    
    # 5. Extraer ruta ordenada
    route = extract_solution(solution, manager, routing)
    
    # 6. Guardar en DB
    save_to_database(route)
```

---

### 7. RabbitMQ (Message Broker)

**Imagen Docker:** RabbitMQ 3 Management  
**Puertos:** 5672 (AMQP), 15672 (Web UI)  
**Credenciales:** user / pass

**Colas:**
1. **signals** - Señales de sensores (15 mensajes cada 30s)
2. **fullcontainers** - Contenedores llenos + señal -1
3. **containerstoclean** - *(Legacy, no usada)*

**Persistencia:** Volumen `rabbitmq_data`

---

### 8. PostgreSQL (Base de Datos)

**Imagen Docker:** PostgreSQL 15 Alpine  
**Puerto:** 5432  
**Base de datos:** mi_base

**Tablas:**

```sql
-- Tabla de contenedores
CREATE TABLE contenedores (
    id INTEGER PRIMARY KEY,
    latitud NUMERIC(10, 8) NOT NULL,
    longitud NUMERIC(11, 8) NOT NULL,
    porcentaje INTEGER NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 100)
);

-- Tabla de rutas
CREATE TABLE rutas (
    id SERIAL PRIMARY KEY,
    cantidad_contenedores INTEGER NOT NULL,
    tiempo_total_minutos NUMERIC NOT NULL,
    ruta JSONB NOT NULL,
    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Persistencia:** Volumen `postgres_data`

---

## 🔗 Comunicación Entre Servicios

### 1. Comunicación Síncrona (HTTP)

```
Frontend ←─ HTTP ─→ Nginx ←─ Proxy ─→ Backend
                                      ↓
                                      HTTP POST
                                      ↓
                              provider-full-containers:3003
```

### 2. Comunicación Asíncrona (RabbitMQ)

```
sender-signals ──→ Queue: signals ──→ consumer-signals
                                              ↓
                                        PostgreSQL

provider-full-containers ──→ Queue: fullcontainers ──→ consumer-full-containers
                                                              ↓
                                                        PostgreSQL: rutas
```

### 3. Comunicación con Base de Datos

```
┌────────────────────┐
│   PostgreSQL       │
└─────────┬──────────┘
          │
          ├─── consumer-signals (Java/JDBC) - WRITE
          ├─── consumer-full-containers (Python/psycopg2) - WRITE
          ├─── provider-full-containers (Node.js/pg) - READ
          └─── backend (Node.js/pg) - READ/WRITE
```

---

## 📊 Base de Datos

### Esquema Completo

```sql
-- Contenedores (estado actual)
CREATE TABLE contenedores (
    id INTEGER PRIMARY KEY,              -- ID fijo 1-15
    latitud NUMERIC(10, 8) NOT NULL,     -- Coordenada fija
    longitud NUMERIC(11, 8) NOT NULL,    -- Coordenada fija
    porcentaje INTEGER NOT NULL          -- Variable 0-100%
    CHECK (porcentaje >= 0 AND porcentaje <= 100)
);

-- Rutas calculadas (historial)
CREATE TABLE rutas (
    id SERIAL PRIMARY KEY,
    cantidad_contenedores INTEGER NOT NULL,
    tiempo_total_minutos NUMERIC NOT NULL,
    ruta JSONB NOT NULL,                 -- Array de contenedores ordenados
    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_contenedores_porcentaje ON contenedores(porcentaje);
CREATE INDEX idx_rutas_fecha ON rutas(fecha_calculo DESC);
```

### Ejemplo de Datos

**Tabla `contenedores`:**
```
 id │  latitud  │ longitud  │ porcentaje 
────┼───────────┼───────────┼────────────
  1 │ -34.9065  │ -56.2040  │     84
  2 │ -34.9060  │ -56.1860  │     12
  3 │ -34.9055  │ -56.1755  │     91
  4 │ -34.8945  │ -56.1645  │     78
...
```

**Tabla `rutas`:**
```json
{
  "id": 42,
  "cantidad_contenedores": 8,
  "tiempo_total_minutos": 12.45,
  "ruta": [
    {"id": 3, "latitud": -34.9055, "longitud": -56.1755, "porcentaje": 91},
    {"id": 1, "latitud": -34.9065, "longitud": -56.2040, "porcentaje": 84},
    {"id": 4, "latitud": -34.8945, "longitud": -56.1645, "porcentaje": 78}
  ],
  "fecha_calculo": "2025-11-07 14:32:18"
}
```

---

## 📨 Colas de RabbitMQ

### Queue: `signals`

**Propósito:** Transportar datos de sensores a consumidor Java

**Publisher:** sender-signals (Node.js)  
**Consumer:** consumer-signals (Java)  
**Frecuencia:** 15 mensajes cada 30 segundos

**Formato de Mensaje:**
```json
{
  "id": 7,
  "latitud": -34.9275,
  "longitud": -56.1555,
  "porcentaje": 83
}
```

**Durabilidad:** No durable (mensajes se pierden si RabbitMQ reinicia)  
**Comportamiento:** Procesamiento inmediato, no hay buffer

---

### Queue: `fullcontainers`

**Propósito:** Transportar contenedores llenos + señal de cálculo

**Publisher:** provider-full-containers (Node.js)  
**Consumer:** consumer-full-containers (Python)  
**Frecuencia:** On-demand (cuando usuario presiona "Comenzar")

**Formato de Mensajes:**

1. **Contenedor lleno:**
```json
{
  "id": 12,
  "latitud": -34.8825,
  "longitud": -56.1630,
  "porcentaje": 95
}
```

2. **Señal de cálculo:**
```json
{
  "id": -1,
  "timestamp": "2025-11-07T14:30:00.000Z"
}
```

**Durabilidad:** No durable  
**Comportamiento:** Buffer hasta señal -1, luego calcula ruta

---

### Queue: `containerstoclean` (Legacy)

**Estado:** No usada en la versión actual  
**Razón:** Backend consulta directamente PostgreSQL en lugar de escuchar esta cola

---

## 💡 Decisiones de Diseño

### 1. ¿Por qué Generación Automática cada 30 segundos?

**Problema Original:** Usuario debía activar manualmente los sensores.

**Solución:** 
- `sender-signals` corre indefinidamente con `setInterval(30000)`
- Simula comportamiento real de sensores IoT
- Permite múltiples ejecuciones sin intervención manual

**Beneficios:**
- ✅ Más realista
- ✅ Menos pasos para el usuario
- ✅ Datos siempre frescos

---

### 2. ¿Por qué HTTP en lugar de RabbitMQ para provider-full-containers?

**Problema:** Backend necesita saber si hay contenedores llenos antes de esperar la ruta.

**Solución:** Convertir `provider-full-containers` en HTTP server

**Ventajas:**
- ✅ Respuesta síncrona: `{hasContainers: true/false, count: N}`
- ✅ Backend puede mostrar error si no hay contenedores
- ✅ Evita esperas innecesarias de 10 segundos

**Desventaja:**
- ❌ Introduce HTTP en arquitectura basada en mensajería

---

### 3. ¿Por qué Polling en Backend en lugar de Consumer?

**Problema:** Consumer Python guarda ruta en DB pero backend no se entera.

**Solución:** Backend hace polling cada 500ms durante máximo 10 segundos

```javascript
while (intentos < 20 && !ruta) {
  await sleep(500);
  const result = await db.query('SELECT * FROM rutas WHERE fecha_calculo >= $1', [tiempoInicio]);
  if (result.rows.length > 0) {
    ruta = result.rows[0];
    break;
  }
  intentos++;
}
```

**Ventajas:**
- ✅ Backend puede retornar ruta completa en una sola petición HTTP
- ✅ Frontend no necesita hacer polling
- ✅ Uso de timestamp garantiza ruta nueva

**Desventajas:**
- ❌ Polling consume recursos
- ❌ Latencia de hasta 500ms

**Alternativas consideradas:**
- ❌ WebSockets: Complejidad innecesaria
- ❌ Consumer RabbitMQ: Requeriría estado compartido

---

### 4. ¿Por qué Coordenadas Fijas?

**Problema:** Coordenadas aleatorias hacían difícil testear rutas.

**Solución:** 15 ubicaciones fijas en Montevideo, solo porcentaje varía

**Ventajas:**
- ✅ Rutas reproducibles
- ✅ Fácil debugging
- ✅ Visualización consistente en mapa

---

### 5. ¿Por qué 8-15 Contenedores Llenos en lugar de siempre 8?

**Problema:** Siempre 8 contenedores llenos es poco realista.

**Solución:** 
```javascript
const cantidadALlenar = Math.floor(Math.random() * 8) + 8; // 8-15
```

**Ventajas:**
- ✅ Más realista
- ✅ Rutas variables
- ✅ Garantiza mínimo 8 para tener ruta calculable

---

### 6. ¿Por qué PostgreSQL JSONB para rutas?

**Problema:** Ruta es un array de objetos, difícil de modelar con SQL tradicional.

**Solución:** Usar tipo `JSONB` en PostgreSQL

**Ventajas:**
- ✅ Flexibilidad: estructura de ruta puede cambiar
- ✅ Performance: JSONB es binario, más rápido que JSON text
- ✅ Queries: `jsonb_pretty()`, `jsonb_array_elements()`, etc.

**Ejemplo:**
```sql
SELECT jsonb_pretty(ruta) FROM rutas ORDER BY fecha_calculo DESC LIMIT 1;
```

---

### 7. ¿Por qué Manejo de "No Contenedores Llenos"?

**Problema:** Si usuario presiona "Comenzar" justo después de finalizar una ruta, todos los contenedores están vacíos.

**Solución:**
- provider-full-containers retorna `{hasContainers: false}`
- Backend detecta esto y retorna error amigable
- Frontend muestra alert: "Espera a que los sensores generen nuevos datos"

**Ventajas:**
- ✅ UX mejorada
- ✅ No se queda en "Iniciando Sistema"
- ✅ Usuario entiende qué pasó

---

## 📈 Escalabilidad y Mejoras Futuras

### Limitaciones Actuales

1. **Polling en Backend**: Consumo de recursos innecesario
2. **Sin autenticación**: Cualquiera puede acceder
3. **Single point of failure**: Un solo backend
4. **No hay retry logic**: Si RabbitMQ falla, se pierden mensajes

### Mejoras Propuestas

1. **WebSockets para notificaciones en tiempo real**
   - Backend envía ruta cuando está lista
   - Elimina polling

2. **Kubernetes para orquestación**
   - Múltiples replicas de backend
   - Load balancing
   - Auto-scaling

3. **Redis para caché**
   - Cachear rutas calculadas
   - Reducir carga en PostgreSQL

4. **Prometheus + Grafana para monitoreo**
   - Métricas de colas RabbitMQ
   - Latencia de endpoints
   - Uso de DB

5. **Circuit Breaker pattern**
   - Si PostgreSQL falla, devolver error rápido
   - Evitar timeouts

---

## 📚 Referencias

- **OR-Tools**: https://developers.google.com/optimization/routing/vrp
- **RabbitMQ**: https://www.rabbitmq.com/documentation.html
- **React Leaflet**: https://react-leaflet.js.org/
- **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html

---

**Última actualización:** Noviembre 2025  
**Versión:** 2.0 (Automatizada)
