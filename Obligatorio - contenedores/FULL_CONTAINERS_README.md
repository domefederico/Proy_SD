# Sistema de Gestión de Contenedores con RabbitMQ

Sistema distribuido con Java 21 y Python que gestiona contenedores de basura mediante colas de mensajes.

## 🚀 Componentes

### 1. **Signals Queue** (Señales)
- **Producer (Java)**: `sender-signals` - Envía señales de control
- **Consumer (Java)**: `consumer-signals` - Procesa señales recibidas

### 2. **Full Containers Queue** (Contenedores Llenos)
- **Provider (Java)**: `provider-full-containers` - Consulta PostgreSQL y publica contenedores con ≥75% de llenado
- **Consumer (Python)**: `consumer-full-containers` - Calcula rutas óptimas usando OpenRouteService y OR-Tools

## 📋 Requisitos

- Docker & Docker Compose
- Conexión a Internet (para OpenRouteService API)

## 🔧 Configuración

### Variables de Entorno

**RabbitMQ:**
- Usuario: `user`
- Password: `pass`
- Puertos: 5672 (broker), 15672 (management UI)

**PostgreSQL:**
- Base de datos: `mi_base`
- Usuario: `postgres`
- Password: `1234`
- Puerto: 5432

## 🏃 Ejecución

### Iniciar todos los servicios:
```bash
docker-compose up --build
```

### Iniciar servicios individuales:
```bash
# Solo RabbitMQ y Signals
docker-compose up rabbitmq sender-signals consumer-signals

# Solo Full Containers (requiere DB)
docker-compose up rabbitmq db provider-full-containers consumer-full-containers
```

### Ver logs:
```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker-compose logs -f provider-full-containers
```

## 📊 Monitoreo

### RabbitMQ Management UI
Acceder a: http://localhost:15672
- Usuario: `user`
- Password: `pass`

### PostgreSQL
```bash
docker exec -it $(docker ps -q -f name=db) psql -U postgres -d mi_base

# Ver contenedores
SELECT * FROM contenedores;

# Ver contenedores llenos
SELECT * FROM contenedores WHERE porcentaje >= 75;
```

## 🧪 Pruebas

### Probar Full Containers manualmente:

1. **Insertar contenedor lleno:**
```sql
INSERT INTO contenedores (latitud, longitud, porcentaje) 
VALUES (-34.9011, -56.1645, 85);
```

2. **Ejecutar el provider** (publica a RabbitMQ):
```bash
docker-compose up provider-full-containers
```

3. **El consumer automáticamente**:
   - Recibe los contenedores
   - Calcula la ruta óptima
   - Muestra el tiempo estimado

### Señal para calcular ruta:
Para que el consumer calcule la ruta óptima, envía un mensaje con `id: -1`:
```json
{"id": -1, "latitud": 0, "longitud": 0}
```

## 🗺️ Arquitectura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ PostgreSQL  │─────>│   Provider   │─────>│  RabbitMQ   │
│             │      │  (Java 21)   │      │   Signals   │
└─────────────┘      └──────────────┘      │Full Contain.│
                                            └──────┬──────┘
                                                   │
                     ┌─────────────────────────────┴─────┐
                     │                                   │
              ┌──────▼──────┐                   ┌────────▼────────┐
              │  Consumer   │                   │   Consumer      │
              │  Signals    │                   │ Route Optimizer │
              │  (Java 21)  │                   │   (Python)      │
              └─────────────┘                   └─────────────────┘
                                                        │
                                                        ▼
                                                ┌───────────────┐
                                                │ OpenRoute API │
                                                └───────────────┘
```

## 🔄 Flujo de Full Containers

1. **Provider** consulta DB cada X tiempo
2. Obtiene contenedores con `porcentaje >= 75`
3. Publica cada uno en cola `fullcontainers`
4. **Consumer** recibe y acumula ubicaciones
5. Al recibir señal (`id: -1`):
   - Consulta API de OpenRouteService
   - Calcula matriz de distancias
   - Resuelve TSP (Traveling Salesman Problem)
   - Muestra ruta óptima y tiempo estimado

## 🛠️ Tecnologías

- **Java 21** (Eclipse Temurin)
- **Python 3.11**
- **Maven 3.9.9**
- **RabbitMQ 3**
- **PostgreSQL 15**
- **OpenRouteService** (rutas)
- **Google OR-Tools** (optimización)

## 📝 Notas

- Los contenedores de ejemplo están ubicados en **Montevideo, Uruguay**
- La API de OpenRouteService tiene límites de uso gratuito
- El sistema usa Java 21 (LTS) con Alpine Linux para imágenes más ligeras
