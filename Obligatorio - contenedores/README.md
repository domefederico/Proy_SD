# 🗑️ EmptyTrash - Sistema Inteligente de Recolección de Residuos# 🗑️ EmptyTrash - Sistema Inteligente de Recolección de Residuos



Sistema distribuido de gestión inteligente de contenedores de basura que simula sensores IoT, calcula rutas óptimas usando OR-Tools, y gestiona la recolección en tiempo real mediante arquitectura de microservicios.Sistema distribuido de gestión inteligente de contenedores de basura que simula sensores IoT, calcula rutas óptimas usando OR-Tools, y gestiona la recolección en tiempo real mediante arquitectura de microservicios.



------



## 🚀 Inicio Rápido## 🚀 Inicio Rápido



### 1. Levantar el sistema completo### 1. Levantar el sistema completo

```bash```bash

docker compose up -ddocker compose up -d

``````



### 2. Acceder a la aplicación### 2. Acceder a la aplicación

- **🌐 Aplicación Web**: http://localhost:3000- **🌐 Aplicación Web**: http://localhost:3000

- **🐰 RabbitMQ Management**: http://localhost:15672 (user: `user`, pass: `pass`)- **🐰 RabbitMQ Management**: http://localhost:15672 (user: `user`, pass: `pass`)

- **🔧 Backend API**: http://localhost:3001- **🔧 Backend API**: http://localhost:3001



### 3. Usar la aplicación### 3. Usar la aplicación

1. Abre **http://localhost:3000** en tu navegador1. Abre **http://localhost:3000** en tu navegador

2. Presiona el botón **"Comenzar Ruta"** 2. Presiona el botón **"Comenzar Ruta"** 

3. El sistema automáticamente:3. El sistema automáticamente:

   - Consulta contenedores llenos (≥75%)   - Consulta contenedores llenos (≥75%)

   - Calcula la ruta óptima (~5-10 segundos)   - Calcula la ruta óptima (~5-10 segundos)

   - Muestra el mapa con la ruta calculada   - Muestra el mapa con la ruta calculada

4. Navega entre contenedores con **"Siguiente Contenedor"**4. Navega entre contenedores con **"Siguiente Contenedor"**

5. Al terminar, presiona **"Finalizar Ruta"** para vaciar los contenedores5. Al terminar, presiona **"Finalizar Ruta"** para vaciar los contenedores



------



## 📐 Arquitectura del Sistema## � Arquitectura del Sistema



### Flujo de Datos Completo### Flujo de Datos Completo



``````

┌─────────────────────────────────────────────────────────────────────┐┌─────────────────────────────────────────────────────────────────────┐

│                    SISTEMA EMPTYTRASH                                ││                    SISTEMA EMPTYTRASH                                │

└─────────────────────────────────────────────────────────────────────┘└─────────────────────────────────────────────────────────────────────┘



1️⃣ GENERACIÓN AUTOMÁTICA DE DATOS (cada 30 segundos)1️⃣ GENERACIÓN AUTOMÁTICA DE DATOS (cada 30 segundos)

      

   ┌──────────────────┐   ┌──────────────────┐

   │ sender-signals   │ → Simula sensores IoT   │ sender-signals   │ → Simula sensores IoT

   │   (Node.js)      │ → Genera 15 contenedores con coordenadas fijas   │   (Node.js)      │ → Genera 15 contenedores con coordenadas fijas

   └────────┬─────────┘ → 8-15 contenedores aleatorios ≥75%   └────────┬─────────┘ → 8-15 contenedores aleatorios ≥75%

            │            │

            ↓            ↓

   ┌──────────────────┐   ┌──────────────────┐

   │  Queue: signals  │ → Cola RabbitMQ   │  Queue: signals  │ → Cola RabbitMQ

   └────────┬─────────┘   └────────┬─────────┘

            │            │

            ↓            ↓

   ┌──────────────────┐   ┌──────────────────┐

   │ consumer-signals │ → Procesa señales y actualiza DB   │ consumer-signals │ → Procesa señales y actualiza DB

   │     (Java)       │ → Upsert en PostgreSQL   │     (Java)       │ → Upsert en PostgreSQL

   └────────┬─────────┘   └────────┬─────────┘

            │            │

            ↓            ↓

   ┌──────────────────┐   ┌──────────────────┐

   │   PostgreSQL     │ → Tabla: contenedores   │   PostgreSQL     │ → Tabla: contenedores

   │  (mi_base DB)    │ → Columnas: id, latitud, longitud, porcentaje   │  (mi_base DB)    │ → Columnas: id, latitud, longitud, porcentaje

   └──────────────────┘   └──────────────────┘





2️⃣ CÁLCULO DE RUTA (activado por usuario)2️⃣ CÁLCULO DE RUTA (activado por usuario)



   Usuario presiona "Comenzar" en Frontend   Usuario presiona "Comenzar" en Frontend

            │            │

            ↓            ↓

   ┌──────────────────┐   ┌──────────────────┐

   │  Frontend React  │ → POST /api/iniciar-flujo   │  Frontend React  │ → POST /api/iniciar-flujo

   │   (Vite + Leaflet)│   │   (Vite + Leaflet)│

   └────────┬─────────┘   └────────┬─────────┘

            │            │

            ↓            ↓

   ┌──────────────────┐   ┌──────────────────┐

   │ Backend Node.js  │ → POST http://provider-full-containers:3003   │ Backend Node.js  │ → POST http://provider-full-containers:3003/consultar-contenedores

   │   (Express API)  │ → Polling DB para esperar ruta   │   (Express API)  │ → Polling DB para esperar ruta

   └────────┬─────────┘   └────────┬─────────┘

            │            │

            ↓            ↓

   ┌────────────────────┐   ┌────────────────────┐

   │ provider-full-     │ → Query: SELECT * WHERE porcentaje >= 75   │ provider-full-     │ → Query: SELECT * WHERE porcentaje >= 75

   │  containers        │ → Publica todos los contenedores llenos   │  containers        │ → Publica todos los contenedores llenos

   │   (Node.js HTTP)   │   │   (Node.js HTTP)   │

   └────────┬───────────┘   └────────┬───────────┘

            │            │

            ↓            ↓

   ┌──────────────────────┐   ┌──────────────────────┐

   │ Queue: fullcontainers│ → Cola RabbitMQ   │ Queue: fullcontainers│ → Cola RabbitMQ

   └────────┬─────────────┘   └────────┬─────────────┘

            │            │

            ↓            ↓

   ┌──────────────────┐   ┌──────────────────┐

   │ consumer-full-   │ → Calcula ruta óptima con OR-Tools   │ consumer-full-   │ → Calcula ruta óptima con OR-Tools

   │  containers      │ → VRP (Vehicle Routing Problem)   │  containers      │ → VRP (Vehicle Routing Problem)

   │  (Python)        │ → Guarda ruta en PostgreSQL   │  (Python)        │ → Guarda ruta en PostgreSQL

   └────────┬─────────┘   └────────┬─────────┘

            │            │

            ↓            ↓

   ┌──────────────────┐   ┌──────────────────┐

   │   PostgreSQL     │ → Tabla: rutas   │   PostgreSQL     │ → Tabla: rutas

   │  (mi_base DB)    │ → ruta (JSONB), fecha_calculo   │  (mi_base DB)    │ → Columnas: cantidad_contenedores, 

   └────────┬─────────┘   └────────┬─────────┘            tiempo_total_minutos,

            │            │                      ruta (JSONB), fecha_calculo

            ↓            │

   ┌──────────────────┐            ↓

   │ Backend Node.js  │ → Detecta ruta nueva en DB   ┌──────────────────┐

   │   (Polling)      │ → Retorna ruta completa al Frontend   │ Backend Node.js  │ → Detecta ruta nueva en DB

   └────────┬─────────┘   │   (Polling)      │ → Retorna ruta completa al Frontend

            │   └────────┬─────────┘

            ↓            │

   ┌──────────────────┐            ↓

   │  Frontend React  │ → Renderiza mapa con ruta   ┌──────────────────┐

   │  (Muestra Ruta)  │ → Usuario navega entre contenedores   │  Frontend React  │ → Renderiza mapa con ruta

   └──────────────────┘   │  (Muestra Ruta)  │ → Usuario navega entre contenedores

   └──────────────────┘



3️⃣ FINALIZACIÓN DE RUTA

3️⃣ FINALIZACIÓN DE RUTA

   Usuario presiona "Finalizar Ruta"

            │   Usuario presiona "Finalizar Ruta"

            ↓            │

   ┌──────────────────┐            ↓

   │  Frontend React  │ → POST /api/ruta/completar   ┌──────────────────┐

   └────────┬─────────┘   │  Frontend React  │ → POST /api/ruta/completar

            │   └────────┬─────────┘

            ↓            │

   ┌──────────────────┐            ↓

   │ Backend Node.js  │ → UPDATE contenedores SET porcentaje = 0   ┌──────────────────┐

   │   (Express API)  │ → Vacía los contenedores recogidos   │ Backend Node.js  │ → UPDATE contenedores SET porcentaje = 0

   └──────────────────┘   │   (Express API)  │ → Vacía los contenedores recogidos

```   └──────────────────┘

```

---

---

## 🏗️ Componentes del Sistema

## 🏗️ Componentes del Sistema

### 🔵 Servicios Activos

### 🔵 Servicios Activos (Producción)

| Servicio | Tecnología | Puerto | Descripción |

|----------|-----------|--------|-------------|| Servicio | Tecnología | Puerto | Descripción |

| **frontend** | React + Vite + Leaflet | 3000 | Interfaz de usuario con mapa interactivo ||----------|-----------|--------|-------------|

| **backend** | Node.js + Express | 3001 | API REST para orquestar el flujo || **frontend** | React + Vite + Leaflet | 3000 | Interfaz de usuario con mapa interactivo |

| **sender-signals** | Node.js + amqplib | - | Generador automático de datos (cada 30s) || **backend** | Node.js + Express | 3001 | API REST para orquestar el flujo |

| **provider-full-containers** | Node.js + Express + pg | 3003 | HTTP endpoint para consultar contenedores llenos || **sender-signals** | Node.js + amqplib | - | Generador automático de datos de sensores (cada 30s) |

| **consumer-signals** | Java + RabbitMQ + JDBC | - | Procesa señales y actualiza DB || **provider-full-containers** | Node.js + Express + pg | 3003 | HTTP endpoint para consultar contenedores llenos |

| **consumer-full-containers** | Python + OR-Tools | - | Calcula rutas óptimas (VRP) || **consumer-signals** | Java + RabbitMQ + JDBC | - | Procesa señales y actualiza DB |

| **rabbitmq** | RabbitMQ 3 | 5672, 15672 | Message broker (3 colas) || **consumer-full-containers** | Python + OR-Tools | - | Calcula rutas óptimas (VRP) |

| **db** | PostgreSQL 15 | 5432 | Base de datos persistente || **rabbitmq** | RabbitMQ 3 | 5672, 15672 | Message broker (3 colas) |

| **db** | PostgreSQL 15 | 5432 | Base de datos persistente |

### 📋 Colas de RabbitMQ

### 📋 Colas de RabbitMQ

1. **`signals`**: Señales de sensores IoT (15 contenedores cada 30s)

2. **`fullcontainers`**: Contenedores llenos para calcular ruta1. **`signals`**: Señales de sensores IoT (15 contenedores cada 30s)

3. **`containerstoclean`**: *(Legacy - no usada actualmente)*2. **`fullcontainers`**: Contenedores llenos para calcular ruta

3. **`containerstoclean`**: *(Legacy - no usada actualmente)*

---

---

## 💾 Estructura de Datos

## 💾 Estructura de Datos

### Tabla: `contenedores`

### Tabla: `contenedores`

```sql

CREATE TABLE contenedores (```sql

    id INTEGER PRIMARY KEY,CREATE TABLE contenedores (

    latitud NUMERIC NOT NULL,    id INTEGER PRIMARY KEY,

    longitud NUMERIC NOT NULL,    latitud NUMERIC NOT NULL,

    porcentaje INTEGER NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 100)    longitud NUMERIC NOT NULL,

);    porcentaje INTEGER NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 100)

```);

```

**Coordenadas Fijas (Montevideo, Uruguay):**

```javascript**Coordenadas Fijas (Montevideo, Uruguay):**

[```javascript

  { id: 1,  latitud: -34.9065, longitud: -56.2040 },[

  { id: 2,  latitud: -34.9060, longitud: -56.1860 },  { id: 1,  latitud: -34.9065, longitud: -56.2040 },

  { id: 3,  latitud: -34.9055, longitud: -56.1755 },  { id: 2,  latitud: -34.9060, longitud: -56.1860 },

  { id: 4,  latitud: -34.8945, longitud: -56.1645 },  { id: 3,  latitud: -34.9055, longitud: -56.1755 },

  { id: 5,  latitud: -34.8855, longitud: -56.1595 },  { id: 4,  latitud: -34.8945, longitud: -56.1645 },

  { id: 6,  latitud: -34.9225, longitud: -56.1545 },  { id: 5,  latitud: -34.8855, longitud: -56.1595 },

  { id: 7,  latitud: -34.9275, longitud: -56.1555 },  { id: 6,  latitud: -34.9225, longitud: -56.1545 },

  { id: 8,  latitud: -34.9095, longitud: -56.1365 },  { id: 7,  latitud: -34.9275, longitud: -56.1555 },

  { id: 9,  latitud: -34.8935, longitud: -56.1195 },  { id: 8,  latitud: -34.9095, longitud: -56.1365 },

  { id: 10, latitud: -34.8935, longitud: -56.0995 },  { id: 9,  latitud: -34.8935, longitud: -56.1195 },

  { id: 11, latitud: -34.8805, longitud: -56.0605 },  { id: 10, latitud: -34.8935, longitud: -56.0995 },

  { id: 12, latitud: -34.8825, longitud: -56.1630 },  { id: 11, latitud: -34.8805, longitud: -56.0605 },

  { id: 13, latitud: -34.8615, longitud: -56.2050 },  { id: 12, latitud: -34.8825, longitud: -56.1630 },

  { id: 14, latitud: -34.8715, longitud: -56.2175 },  { id: 13, latitud: -34.8615, longitud: -56.2050 },

  { id: 15, latitud: -34.8855, longitud: -56.2370 }  { id: 14, latitud: -34.8715, longitud: -56.2175 },

]  { id: 15, latitud: -34.8855, longitud: -56.2370 }

```]

```

**Nota**: Las coordenadas son fijas, **solo el porcentaje varía** en cada ciclo de 30 segundos.

**Nota**: Las coordenadas son fijas, **solo el porcentaje varía** en cada ciclo de 30 segundos.

### Tabla: `rutas`

### Tabla: `rutas`

```sql

CREATE TABLE rutas (```sql

    id SERIAL PRIMARY KEY,CREATE TABLE rutas (

    cantidad_contenedores INTEGER NOT NULL,    id SERIAL PRIMARY KEY,

    tiempo_total_minutos NUMERIC NOT NULL,    cantidad_contenedores INTEGER NOT NULL,

    ruta JSONB NOT NULL,    tiempo_total_minutos NUMERIC NOT NULL,

    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP    ruta JSONB NOT NULL,

);    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP

```);

```

**Ejemplo de campo `ruta` (JSONB):**

```json**Ejemplo de campo `ruta` (JSONB):**

[```json

  { "id": 7, "latitud": -34.9275, "longitud": -56.1555, "porcentaje": 96 },[

  { "id": 2, "latitud": -34.9060, "longitud": -56.1860, "porcentaje": 93 },  { "id": 7, "latitud": -34.9275, "longitud": -56.1555, "porcentaje": 96 },

  { "id": 4, "latitud": -34.8945, "longitud": -56.1645, "porcentaje": 94 }  { "id": 2, "latitud": -34.9060, "longitud": -56.1860, "porcentaje": 93 },

]  { "id": 4, "latitud": -34.8945, "longitud": -56.1645, "porcentaje": 94 },

```  ...

]

---```



## 🎲 Lógica de Simulación---



### sender-signals (Generador de Datos)## 🎲 Lógica de Simulación



Cada **30 segundos** ejecuta automáticamente:### sender-signals (Generador de Datos)



1. **Selecciona aleatoriamente entre 8 y 15 contenedores** para llenarCada **30 segundos** ejecuta automáticamente:

2. Contenedores seleccionados: `porcentaje = random(75-100)`

3. Contenedores NO seleccionados: `porcentaje = random(0-74)`1. **Selecciona aleatoriamente entre 8 y 15 contenedores** para llenar

4. Publica 15 mensajes a la cola `signals`2. Contenedores seleccionados: `porcentaje = random(75-100)`

3. Contenedores NO seleccionados: `porcentaje = random(0-74)`

**Algoritmo de selección:**4. Publica 15 mensajes a la cola `signals`

```javascript

const cantidadALlenar = Math.floor(Math.random() * 8) + 8; // 8-15**Algoritmo de selección:**

// Fisher-Yates shuffle para selección aleatoria sin repetición```javascript

```const cantidadALlenar = Math.floor(Math.random() * 8) + 8; // 8-15

// Fisher-Yates shuffle para selección aleatoria sin repetición

**Resultado:** Siempre habrá **mínimo 8 contenedores llenos** para garantizar rutas calculables.```



---**Resultado:** Siempre habrá **mínimo 8 contenedores llenos** para garantizar rutas calculables.



## 🛠️ Comandos Útiles---



### Ver logs en tiempo real## 🛠️ Comandos Útiles



```bash### Ver logs en tiempo real

# Backend

docker logs obligatorio-contenedores-backend-1 -f```bash

# Backend

# Generador de sensoresdocker logs obligatorio-contenedores-backend-1 -f

docker logs obligatorio-contenedores-sender-signals-1 -f

# Generador de sensores

# Consumer de señales (Java)docker logs obligatorio-contenedores-sender-signals-1 -f

docker logs obligatorio-contenedores-consumer-signals-1 -f

# Consumer de señales (Java)

# Consumer de rutas (Python)docker logs obligatorio-contenedores-consumer-signals-1 -f

docker logs obligatorio-contenedores-consumer-full-containers-1 -f

# Consumer de rutas (Python)

# Todos los serviciosdocker logs obligatorio-contenedores-consumer-full-containers-1 -f

docker compose logs -f

```# Todos los servicios

docker compose logs -f

### Consultar base de datos```



```bash### Consultar base de datos

# Ver contenedores ordenados por porcentaje

docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \```bash

  "SELECT id, latitud, longitud, porcentaje FROM contenedores ORDER BY porcentaje DESC;"# Ver contenedores ordenados por porcentaje

docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \

# Ver últimas rutas calculadas  "SELECT id, latitud, longitud, porcentaje FROM contenedores ORDER BY porcentaje DESC;"

docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \

  "SELECT cantidad_contenedores, tiempo_total_minutos, fecha_calculo FROM rutas ORDER BY fecha_calculo DESC LIMIT 5;"# Ver últimas rutas calculadas

docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \

# Ver ruta completa (JSON formateado)  "SELECT cantidad_contenedores, tiempo_total_minutos, fecha_calculo FROM rutas ORDER BY fecha_calculo DESC LIMIT 5;"

docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \

  "SELECT jsonb_pretty(ruta) FROM rutas ORDER BY fecha_calculo DESC LIMIT 1;"# Ver ruta completa (JSON formateado)

```docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \

  "SELECT jsonb_pretty(ruta) FROM rutas ORDER BY fecha_calculo DESC LIMIT 1;"

### Operaciones de mantenimiento```



```bash### Operaciones de mantenimiento

# Resetear todos los contenedores a 0%

docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \```bash

  "UPDATE contenedores SET porcentaje = 0;"# Resetear todos los contenedores a 0%

docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \

# Reconstruir un servicio específico  "UPDATE contenedores SET porcentaje = 0;"

docker compose up -d --build <servicio>

# Ejemplos: sender-signals, backend, frontend, provider-full-containers# Reconstruir un servicio específico

docker compose up -d --build <servicio>

# Reiniciar todo el sistema# Ejemplos: sender-signals, backend, frontend, provider-full-containers

docker compose restart

# Reiniciar todo el sistema

# Detener tododocker compose restart

docker compose down

# Detener todo

# Eliminar volúmenes (reset completo - ⚠️ BORRA TODOS LOS DATOS)docker compose down

docker compose down -v

```# Eliminar volúmenes (reset completo - ⚠️ BORRA TODOS LOS DATOS)

docker compose down -v

### Monitoreo de RabbitMQ```



```bash### Monitoreo de RabbitMQ

# Verificar colas

docker exec obligatorio-contenedores-rabbitmq-1 rabbitmqctl list_queues```bash

# Verificar colas

# Ver conexiones activasdocker exec obligatorio-contenedores-rabbitmq-1 rabbitmqctl list_queues

docker exec obligatorio-contenedores-rabbitmq-1 rabbitmqctl list_connections

# Ver conexiones activas

# O usar la interfaz web: http://localhost:15672docker exec obligatorio-contenedores-rabbitmq-1 rabbitmqctl list_connections

```

# O usar la interfaz web: http://localhost:15672

---```



## 🔧 Desarrollo---



### Estructura del Proyecto## 🔧 Desarrollo



```### Estructura del Proyecto

Obligatorio - contenedores/

├── docker-compose.yml          # Orquestación de todos los servicios```

├── init.sql                    # Script de inicialización de PostgreSQLObligatorio - contenedores/

│├── docker-compose.yml          # Orquestación de todos los servicios

├── frontend/                   # React + Vite + Leaflet├── init.sql                    # Script de inicialización de PostgreSQL

│   ├── src/│

│   │   ├── App.jsx            # Componente principal con lógica de flujo├── frontend/                   # React + Vite + Leaflet

│   │   ├── components/│   ├── src/

│   │   │   ├── MapView.jsx    # Mapa interactivo con Leaflet│   │   ├── App.jsx            # Componente principal con lógica de flujo

│   │   │   ├── ControlPanel.jsx│   │   ├── components/

│   │   │   └── WelcomeScreen.jsx│   │   │   ├── MapView.jsx    # Mapa interactivo con Leaflet

│   │   └── ...│   │   │   ├── ControlPanel.jsx

│   ├── nginx.conf             # Proxy inverso (backend en /api)│   │   │   └── WelcomeScreen.jsx

│   └── Dockerfile│   │   └── ...

││   ├── nginx.conf             # Proxy inverso (backend en /api)

├── backend/                    # Node.js + Express│   └── Dockerfile

│   ├── server.js              # API REST (endpoints /api/*)│

│   ├── config/├── backend/                    # Node.js + Express

│   │   └── database.js        # Configuración PostgreSQL│   ├── server.js              # API REST (endpoints /api/*)

│   └── Dockerfile│   ├── config/

││   │   └── database.js        # Configuración PostgreSQL

├── producers/│   └── Dockerfile

│   ├── sender-signals-js/     # Generador automático de sensores│

│   │   ├── index.js           # Genera datos cada 30s├── producers/

│   │   ├── config/│   ├── sender-signals-js/     # Generador automático de sensores

│   │   │   └── rabbitmq.js│   │   ├── index.js           # Genera datos cada 30s

│   │   └── Dockerfile│   │   ├── config/

│   ││   │   │   └── rabbitmq.js

│   └── provider-full-containers-js/  # HTTP endpoint│   │   └── Dockerfile

│       ├── index.js           # Express server puerto 3003│   │

│       ├── config/│   └── provider-full-containers-js/  # HTTP endpoint

│       │   ├── rabbitmq.js│       ├── index.js           # Express server puerto 3003

│       │   └── database.js│       ├── config/

│       └── Dockerfile│       │   ├── rabbitmq.js

││       │   └── database.js

├── consumers/│       └── Dockerfile

│   ├── consumer-signals/      # Java - Procesa señales│

│   │   ├── src/main/java/...├── consumers/

│   │   ├── pom.xml│   ├── consumer-signals/      # Java - Procesa señales

│   │   └── Dockerfile│   │   ├── src/main/java/...

│   ││   │   ├── pom.xml

│   └── consumerFullContainers/  # Python - Calcula rutas│   │   └── Dockerfile

│       ├── consumerFullContainers.py│   │

│       ├── requirements.txt   # OR-Tools│   └── consumerFullContainers/  # Python - Calcula rutas

│       └── Dockerfile│       ├── consumerFullContainers.py

││       ├── requirements.txt   # OR-Tools

└── common/                    # Código compartido (Java)│       └── Dockerfile

    ├── QueueNames.java│

    └── RabbitConfig.java└── common/                    # Código compartido (Java)

```    ├── QueueNames.java

    └── RabbitConfig.java

### Variables de Entorno Clave```



```bash### Variables de Entorno Clave

# RabbitMQ

RABBITMQ_URL=amqp://user:pass@rabbitmq:5672```bash

# RabbitMQ

# PostgreSQLRABBITMQ_URL=amqp://user:pass@rabbitmq:5672

DB_HOST=db

DB_PORT=5432# PostgreSQL

DB_USER=postgresDB_HOST=db

DB_PASSWORD=postgresDB_PORT=5432

DB_NAME=mi_baseDB_USER=postgres

DB_PASSWORD=postgres

# Puertos de serviciosDB_NAME=mi_base

FRONTEND_PORT=3000

BACKEND_PORT=3001# Puertos de servicios

PROVIDER_PORT=3003FRONTEND_PORT=3000

RABBITMQ_PORT=5672BACKEND_PORT=3001

RABBITMQ_MANAGEMENT=15672PROVIDER_PORT=3003

POSTGRES_PORT=5432RABBITMQ_PORT=5672

```RABBITMQ_MANAGEMENT=15672

POSTGRES_PORT=5432

### Flujo de Desarrollo```



1. **Modificar código** en tu editor### Flujo de Desarrollo

2. **Reconstruir servicio afectado:**

   ```bash1. **Modificar código** en tu editor

   docker compose up -d --build <servicio>2. **Reconstruir servicio afectado:**

   ```   ```bash

3. **Ver logs para debugging:**   docker compose up -d --build <servicio>

   ```bash   ```

   docker logs <contenedor> -f3. **Ver logs para debugging:**

   ```   ```bash

4. **Si cambias el backend**, reinicia frontend (nginx cache):   docker logs <contenedor> -f

   ```bash   ```

   docker compose restart frontend4. **Si cambias el backend**, reinicia frontend (nginx cache):

   ```   ```bash

   docker compose restart frontend

---   ```



## 🐛 Troubleshooting---



### Frontend se queda en "Iniciando Sistema"## 🐛 Troubleshooting



**Causa:** Backend no responde o la ruta no se calculó.### Frontend se queda en "Iniciando Sistema"



**Solución:****Causa:** Backend no responde o la ruta no se calculó.

```bash

# 1. Verificar logs del backend**Solución:**

docker logs obligatorio-contenedores-backend-1 --tail 50```bash

# 1. Verificar logs del backend

# 2. Verificar que hay contenedores llenosdocker logs obligatorio-contenedores-backend-1 --tail 50

docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \

  "SELECT COUNT(*) FROM contenedores WHERE porcentaje >= 75;"# 2. Verificar que hay contenedores llenos

docker exec -it obligatorio-contenedores-db-1 psql -U postgres -d mi_base -c \

# 3. Si no hay contenedores llenos, esperar 30 segundos (próximo ciclo de sensores)  "SELECT COUNT(*) FROM contenedores WHERE porcentaje >= 75;"

```

# 3. Si no hay contenedores llenos, esperar 30 segundos (próximo ciclo de sensores)

### Error "No hay contenedores que necesiten vaciarse"```



**Causa:** Todos los contenedores están <75% o acaban de ser vaciados.### Error "No hay contenedores que necesiten vaciarse"



**Solución:** Espera 30 segundos para que `sender-signals` genere nuevos datos automáticamente.**Causa:** Todos los contenedores están <75% o acaban de ser vaciados.



### RabbitMQ no conecta**Solución:** Espera 30 segundos para que `sender-signals` genere nuevos datos automáticamente.



**Solución:**### RabbitMQ no conecta

```bash

# Verificar que RabbitMQ está corriendo**Solución:**

docker ps | grep rabbitmq```bash

# Verificar que RabbitMQ está corriendo

# Ver logs de RabbitMQdocker ps | grep rabbitmq

docker logs obligatorio-contenedores-rabbitmq-1

# Ver logs de RabbitMQ

# Reiniciar RabbitMQdocker logs obligatorio-contenedores-rabbitmq-1

docker compose restart rabbitmq

```# Reiniciar RabbitMQ

docker compose restart rabbitmq

### PostgreSQL no conecta```



**Solución:**### PostgreSQL no conecta

```bash

# Verificar salud del contenedor**Solución:**

docker compose ps db```bash

# Verificar salud del contenedor

# Ver logsdocker compose ps db

docker logs obligatorio-contenedores-db-1

# Ver logs

# Reconstruir (⚠️ PIERDE DATOS)docker logs obligatorio-contenedores-db-1

docker compose down

docker compose up -d# Reconstruir (⚠️ PIERDE DATOS)

```docker compose down

docker compose up -d

---```



## 📊 Stack Tecnológico---



### Frontend## 📊 Stack Tecnológico

- **React 18** - Framework UI

- **Vite** - Build tool y dev server### Frontend

- **Leaflet** - Mapas interactivos- **React 18** - Framework UI

- **OpenStreetMap** - Tiles de mapas- **Vite** - Build tool y dev server

- **Nginx** - Servidor web y proxy- **Leaflet** - Mapas interactivos

- **OpenStreetMap** - Tiles de mapas

### Backend- **Nginx** - Servidor web y proxy

- **Node.js 20** - Runtime

- **Express 4** - Framework web### Backend

- **node-postgres (pg)** - Cliente PostgreSQL- **Node.js 20** - Runtime

- **node-fetch** - HTTP client- **Express 4** - Framework web

- **node-postgres (pg)** - Cliente PostgreSQL

### Message Broker- **node-fetch** - HTTP client

- **RabbitMQ 3** - Message queue

- **amqplib** - Cliente Node.js### Message Broker

- **Spring AMQP** - Cliente Java- **RabbitMQ 3** - Message queue

- **pika** - Cliente Python- **amqplib** - Cliente Node.js

- **Spring AMQP** - Cliente Java

### Base de Datos- **pika** - Cliente Python

- **PostgreSQL 15** - Database

- **JSONB** - Almacenamiento de rutas### Base de Datos

- **PostgreSQL 15** - Database

### Optimización- **JSONB** - Almacenamiento de rutas

- **OR-Tools** (Google) - Vehicle Routing Problem (VRP)

### Optimización

### Contenedorización- **OR-Tools** (Google) - Vehicle Routing Problem (VRP)

- **Docker** - Containerización

- **Docker Compose** - Orquestación multi-contenedor### Contenedorización

- **Docker** - Containerización

---- **Docker Compose** - Orquestación multi-contenedor



## 📝 Notas Importantes---



### ⚠️ Diferencias con versión anterior## 📝 Notas Importantes



Esta es la versión **automatizada y optimizada**:### ⚠️ Diferencias con versión anterior



✅ **Antes**: Usuario debía activar manualmente sensores → provider → consumer  Esta es la versión **automatizada y optimizada**:

✅ **Ahora**: Sensores automáticos cada 30s + botón "Comenzar" activa todo el flujo

✅ **Antes**: Usuario debía activar manualmente sensores → provider → consumer  

✅ **Antes**: 8 contenedores fijos siempre  ✅ **Ahora**: Sensores automáticos cada 30s + botón "Comenzar" activa todo el flujo

✅ **Ahora**: Entre 8-15 contenedores aleatorios (más realista)

✅ **Antes**: 8 contenedores fijos siempre  

✅ **Antes**: Coordenadas aleatorias diferentes cada vez  ✅ **Ahora**: Entre 8-15 contenedores aleatorios (más realista)

✅ **Ahora**: 15 coordenadas fijas en Montevideo, solo varía el porcentaje

✅ **Antes**: Coordenadas aleatorias diferentes cada vez  

✅ **Antes**: Frontend hacía polling cada 2 segundos  ✅ **Ahora**: 15 coordenadas fijas en Montevideo, solo varía el porcentaje

✅ **Ahora**: Backend hace polling y retorna la ruta completa

✅ **Antes**: Frontend hacía polling cada 2 segundos  

✅ **Antes**: Múltiples endpoints y llamadas manuales  ✅ **Ahora**: Backend hace polling y retorna la ruta completa

✅ **Ahora**: Un solo endpoint `/api/iniciar-flujo` orquesta todo

✅ **Antes**: Múltiples endpoints y llamadas manuales  

### 🔒 Persistencia de Datos✅ **Ahora**: Un solo endpoint `/api/iniciar-flujo` orquesta todo



Los volúmenes de Docker persisten datos entre reinicios:### 🔒 Persistencia de Datos

- `rabbitmq_data` - Configuración y mensajes de RabbitMQ

- `postgres_data` - Base de datos completa (contenedores + rutas)Los volúmenes de Docker persisten datos entre reinicios:

- `rabbitmq_data` - Configuración y mensajes de RabbitMQ

**Para reset completo:**- `postgres_data` - Base de datos completa (contenedores + rutas)

```bash

docker compose down -v  # ⚠️ ELIMINA TODOS LOS DATOS**Para reset completo:**

docker compose up -d```bash

```docker compose down -v  # ⚠️ ELIMINA TODOS LOS DATOS

docker compose up -d

### 🎯 Casos de Uso```



1. **Demo en vivo**: Presiona "Comenzar" y muestra la ruta calculada inmediatamente### � Casos de Uso

2. **Testing de rutas**: Ejecuta múltiples veces para ver diferentes rutas

3. **Monitoreo**: Observa logs de sensores generándose cada 30 segundos1. **Demo en vivo**: Presiona "Comenzar" y muestra la ruta calculada inmediatamente

4. **Aprendizaje**: Estudia cómo interactúan microservicios, colas y DB2. **Testing de rutas**: Ejecuta múltiples veces para ver diferentes rutas

3. **Monitoreo**: Observa logs de sensores generándose cada 30 segundos

---4. **Aprendizaje**: Estudia cómo interactúan microservicios, colas y DB



## 🤝 Contribuir---



Para añadir nuevas características:## 🤝 Contribuir



1. Modifica el código en la carpeta correspondientePara añadir nuevas características:

2. Reconstruye el servicio: `docker compose up -d --build <servicio>`

3. Verifica logs: `docker logs <contenedor> -f`1. Modifica el código en la carpeta correspondiente

4. Testea la funcionalidad completa2. Reconstruye el servicio: `docker compose up -d --build <servicio>`

3. Verifica logs: `docker logs <contenedor> -f`

---4. Testea la funcionalidad completa



## 📄 Licencia---



Este proyecto es parte de un trabajo académico de Sistemas Distribuidos.## 📄 Licencia



---Este proyecto es parte de un trabajo académico de Sistemas Distribuidos.



## 👥 Autores---



Proyecto desarrollado para el curso de Sistemas Distribuidos.## 👥 Autores



---Proyecto desarrollado para el curso de Sistemas Distribuidos.



**🎉 ¡Listo para usar! Ejecuta `docker compose up -d` y abre http://localhost:3000**---


**🎉 ¡Listo para usar! Ejecuta `docker compose up -d` y abre http://localhost:3000**
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
