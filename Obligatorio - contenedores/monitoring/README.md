# 📊 Monitoreo con Prometheus y Grafana

Este directorio contiene la configuración para el monitoreo del sistema EmptyTrash usando Prometheus y Grafana.

## 🚀 Servicios de Monitoreo

### Prometheus (Puerto 9090)
- **URL**: http://localhost:9090
- **Función**: Recolecta y almacena métricas de tiempo serie
- **Datos**: prometheus_data (volumen Docker)

### Grafana (Puerto 3002)
- **URL**: http://localhost:3002
- **Credenciales**: admin / admin
- **Función**: Visualización de métricas con dashboards
- **Datos**: grafana_data (volumen Docker)

### Exporters

#### PostgreSQL Exporter (Puerto 9187)
- Métricas de base de datos:
  - Queries por segundo
  - Conexiones activas
  - Tamaño de tablas
  - Cache hits/misses

#### RabbitMQ Metrics (Puerto 15692)
- Métricas de colas:
  - Mensajes en colas (signals, fullcontainers, containerstoclean)
  - Rate de publicación/consumo
  - Consumers activos

#### cAdvisor (Puerto 8080)
- Métricas de contenedores:
  - CPU usage
  - Memoria RAM
  - Network I/O
  - Disk I/O

## 📈 Dashboards Recomendados

Una vez que Grafana esté corriendo, podés importar estos dashboards:

1. **PostgreSQL Database** (ID: 9628)
   - Ir a Grafana → Dashboards → Import
   - Ingresar ID: 9628
   - Seleccionar datasource: Prometheus

2. **RabbitMQ Overview** (ID: 10991)
   - Import ID: 10991
   - Datasource: Prometheus

3. **Docker Container Monitoring** (ID: 193)
   - Import ID: 193
   - Datasource: Prometheus

## 🔧 Uso

### Ver métricas en Prometheus
```bash
# Abrir en navegador
open http://localhost:9090

# Queries útiles:
# - Mensajes en cola signals: rabbitmq_queue_messages{queue="signals"}
# - CPU por contenedor: container_cpu_usage_seconds_total
# - Queries PostgreSQL: pg_stat_database_tup_returned
```

### Ver dashboards en Grafana
```bash
# Abrir en navegador
open http://localhost:3002

# Login: admin / admin
# Ir a Dashboards → Import → Ingresar ID del dashboard
```

## 📊 Métricas Principales

### RabbitMQ
- `rabbitmq_queue_messages` - Mensajes en cola
- `rabbitmq_queue_messages_ready` - Mensajes listos para consumir
- `rabbitmq_queue_consumers` - Número de consumers
- `rabbitmq_channel_messages_published_total` - Total de mensajes publicados

### PostgreSQL
- `pg_stat_database_tup_fetched` - Filas leídas
- `pg_stat_database_tup_inserted` - Filas insertadas
- `pg_stat_database_tup_updated` - Filas actualizadas
- `pg_stat_database_numbackends` - Conexiones activas

### Docker Containers
- `container_cpu_usage_seconds_total` - Uso de CPU
- `container_memory_usage_bytes` - Uso de memoria
- `container_network_receive_bytes_total` - Bytes recibidos
- `container_network_transmit_bytes_total` - Bytes transmitidos

## 🛠️ Troubleshooting

### Prometheus no muestra targets
```bash
# Verificar que los exporters estén corriendo
docker compose ps

# Ver logs de Prometheus
docker compose logs prometheus
```

### Grafana no conecta con Prometheus
```bash
# Verificar que Prometheus esté accesible
curl http://localhost:9090/-/healthy

# Verificar datasource en Grafana
# Settings → Data Sources → Prometheus → Test
```

### RabbitMQ no exporta métricas
```bash
# Verificar que el puerto 15692 esté abierto
curl http://localhost:15692/metrics

# Si no funciona, habilitar el plugin manualmente:
docker compose exec rabbitmq rabbitmq-plugins enable rabbitmq_prometheus
```

## 📝 Archivos de Configuración

- `prometheus.yml` - Configuración de scraping de Prometheus
- `grafana-datasources.yml` - Datasources de Grafana
- `rabbitmq.conf` - Configuración de métricas de RabbitMQ
