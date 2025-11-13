# 🎉 PROMETHEUS + GRAFANA INTEGRADO CON ÉXITO

## ✅ Servicios Disponibles

### 📊 Dashboards y Monitoreo

| Servicio | URL | Credenciales | Puerto |
|----------|-----|--------------|--------|
| **Frontend EmptyTrash** | http://localhost:3000 | - | 3000 |
| **Backend API** | http://localhost:3001 | - | 3001 |
| **Grafana** | http://localhost:3002 | admin / admin | 3002 |
| **Prometheus** | http://localhost:9090 | - | 9090 |
| **RabbitMQ Management** | http://localhost:15672 | user / pass | 15672 |
| **cAdvisor** | http://localhost:8080 | - | 8080 |

---

## 🚀 GUÍA RÁPIDA DE USO

### 1. Abrir Grafana
```bash
# En tu navegador:
open http://localhost:3002

# Login: admin / admin
# (te pedirá cambiar la contraseña en el primer login)
```

### 2. Importar Dashboards Recomendados

Una vez en Grafana:

#### **Dashboard PostgreSQL (ID: 9628)**
1. Click en el menú hamburguesa (☰) → Dashboards
2. Click en "New" → "Import"
3. Pegar ID: **9628**
4. Click "Load"
5. Seleccionar datasource: **Prometheus**
6. Click "Import"

#### **Dashboard RabbitMQ (ID: 10991)**
1. Dashboards → New → Import
2. ID: **10991**
3. Datasource: **Prometheus**
4. Import

#### **Dashboard Docker (ID: 193)**
1. Dashboards → New → Import
2. ID: **193**
3. Datasource: **Prometheus**
4. Import

---

## 📊 MÉTRICAS QUE PODÉS VER

### **PostgreSQL**
- ✅ Queries ejecutadas por segundo
- ✅ Conexiones activas
- ✅ Tamaño de la base de datos
- ✅ Número de filas en tablas `contenedores` y `rutas`
- ✅ Cache hits (eficiencia)
- ✅ Transacciones commit/rollback

### **RabbitMQ**
- ✅ Mensajes en colas: `signals`, `fullcontainers`, `containerstoclean`
- ✅ Rate de mensajes publicados/consumidos
- ✅ Consumers activos por cola
- ✅ Mensajes pendientes (ready)
- ✅ Mensajes no reconocidos (unacked)

### **Docker Containers**
- ✅ CPU usage por contenedor
- ✅ Memoria RAM por contenedor
- ✅ Network I/O (bytes sent/received)
- ✅ Disk I/O
- ✅ Restart count

---

## 🔍 QUERIES ÚTILES EN PROMETHEUS

Abrí Prometheus en http://localhost:9090 y probá estas queries:

### RabbitMQ
```promql
# Mensajes en cola "signals"
rabbitmq_queue_messages{queue="signals"}

# Rate de mensajes publicados en últimos 5min
rate(rabbitmq_channel_messages_published_total[5m])

# Consumers activos
rabbitmq_queue_consumers
```

### PostgreSQL
```promql
# Queries por segundo
rate(pg_stat_database_xact_commit[1m])

# Conexiones activas
pg_stat_database_numbackends{datname="mi_base"}

# Filas insertadas
rate(pg_stat_database_tup_inserted[5m])
```

### Docker
```promql
# CPU usage por contenedor (%)
rate(container_cpu_usage_seconds_total[1m]) * 100

# Memoria RAM por contenedor (MB)
container_memory_usage_bytes / 1024 / 1024

# Network bytes recibidos
rate(container_network_receive_bytes_total[1m])
```

---

## 🎨 CREAR TU PROPIO DASHBOARD

1. En Grafana → Dashboards → New Dashboard
2. Add visualization
3. Seleccionar datasource: Prometheus
4. En el query builder, escribir una query (ejemplo: `rabbitmq_queue_messages`)
5. Ajustar el tipo de gráfico (Time series, Gauge, Stat, etc.)
6. Guardar el panel
7. Guardar el dashboard

---

## 🛠️ TROUBLESHOOTING

### Grafana no muestra datos
```bash
# 1. Verificar que Prometheus esté corriendo
curl http://localhost:9090/-/healthy

# 2. Ver targets en Prometheus
# Abrir: http://localhost:9090/targets
# Todos deben estar "UP"

# 3. Ver logs de Grafana
docker compose logs grafana
```

### Prometheus no scrapeea RabbitMQ
```bash
# Verificar métricas de RabbitMQ
curl http://localhost:15692/metrics

# Si no funciona, reiniciar RabbitMQ
docker compose restart rabbitmq
```

### PostgreSQL exporter no conecta
```bash
# Ver logs del exporter
docker compose logs postgres-exporter

# Reiniciar el exporter
docker compose restart postgres-exporter
```

---

## 📈 EJEMPLO DE USO REAL

### Monitorear el flujo de contenedores llenos:

1. Abrí Grafana → Dashboard RabbitMQ
2. Buscá el panel "Messages in queues"
3. Vas a ver:
   - **signals**: Aumenta cada 30s cuando sender-signals envía datos
   - **fullcontainers**: Sube cuando hacés click en "Comenzar" 
   - **containerstoclean**: Aparece 1 mensaje después del cálculo de ruta

4. Abrí el dashboard de Docker
5. Observá el CPU y memoria de `consumer-full-containers` cuando está calculando la ruta

### Detectar problemas:

- **Cola signals con 100+ mensajes**: consumer-signals está atrasado
- **PostgreSQL con muchas conexiones**: Posible connection leak
- **Alto CPU en consumer-full-containers**: Ruta muy compleja (muchos contenedores)

---

## 📝 LOGS ADICIONALES

Ver logs en tiempo real de cualquier servicio:

```bash
# Ver todos los logs
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f prometheus
docker compose logs -f grafana
docker compose logs -f rabbitmq

# Ver últimas 100 líneas
docker compose logs --tail=100 backend
```

---

## 🎯 MÉTRICAS CLAVE PARA TU INFORME

Para tu presentación, estas son las métricas más impresionantes para mostrar:

1. **RabbitMQ Queue Messages**: Muestra el flujo asíncrono en tiempo real
2. **PostgreSQL Transactions**: Demuestra la actividad de la base de datos
3. **Container CPU Usage**: Compara el consumo entre microservicios
4. **Container Memory**: Identifica cuál servicio usa más recursos
5. **Network I/O**: Muestra la comunicación entre contenedores

---

## 🚀 PRÓXIMOS PASOS (Opcional)

### Alertas (avanzado):
- Configurar alertas en Grafana para detectar:
  - Colas con más de 50 mensajes
  - CPU > 80%
  - Memoria > 500MB
  - PostgreSQL con > 10 conexiones

### Dashboards personalizados:
- Dashboard específico de EmptyTrash mostrando:
  - Contenedores procesados por hora
  - Tiempo promedio de cálculo de ruta
  - Cantidad de rutas generadas por día

---

¡Ahora tenés un sistema de monitoreo completo y profesional! 🎉
```
