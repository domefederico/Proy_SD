# Proyecto: Señales con RabbitMQ (Productor/Consumidor)

Este proyecto muestra, paso a paso, cómo dos programas se comunican usando RabbitMQ: uno envía mensajes (productor) y otro los recibe (consumidor). Se ejecutan con Docker y Docker Compose.

---

## ¿Qué es RabbitMQ y qué es una cola?
- Imagínate un buzón compartido (la "cola").
- El productor mete cartas (mensajes) en ese buzón.
- El consumidor abre el buzón y saca las cartas para procesarlas.
- RabbitMQ es el cartero/buzón: guarda mensajes y se asegura de entregarlos a los consumidores.

---

## Componentes de este repo
- `producers/sender-signals`: app Java que ENVÍA mensajes a la cola `signals`.
- `consumers/consumer-signals`: app Java que RECIBE mensajes de la cola `signals`.
- `common/`: código compartido (config y nombre de la cola).
- `docker-compose.yml`: levanta RabbitMQ y construye/ejecuta las apps.

---

## Flujo de punta a punta
1. Se levanta RabbitMQ (usuario `user`, contraseña `pass`).
2. El consumidor arranca, se conecta a RabbitMQ y queda "escuchando" la cola `signals`.
3. El productor se conecta, asegura que exista la cola y envía 1 mensaje, luego termina.
4. RabbitMQ entrega ese mensaje al consumidor, que lo imprime por consola.

---

## Archivos clave
- `common/RabbitConfig.java`: crea la conexión a RabbitMQ. Host `rabbitmq` (el nombre del servicio en Docker Compose), usuario `user`, pass `pass`.
- `common/QueueNames.java`: centraliza el nombre de la cola: `signals`.
- `sender-signals/Sender_signal_reciever.java`: publica un mensaje en la cola `signals` y cierra.
- `consumer-signals/Consumer_signal_reciever.java`: se suscribe a la cola `signals` y procesa mensajes de forma continua.
- Dockerfiles: usan Maven para compilar cada app (multi-stage) y ejecutarlas como JAR.

---

## Cómo ejecutarlo
Requisitos: Docker y Docker Compose.

1) Construir imágenes

```bash
cd "Obligatorio - contenedores"
docker compose build
```

2) Levantar RabbitMQ

```bash
docker compose up -d rabbitmq
```

- Panel web de RabbitMQ: http://localhost:15672 (user: `user`, pass: `pass`).
- Verás la cola `signals` cuando el productor/consumidor la declaren.

3) Arrancar el consumidor (escucha mensajes)

```bash
docker compose up -d consumer-signals
```

4) Enviar un mensaje con el productor (corre y sale)

```bash
# Ejecutar una vez y destruir contenedor al terminar
docker compose run --rm sender-signals
```

- El log del consumidor debería mostrar algo como: `Recibido 'Señal enviada a las <timestamp>'`.

Para ver logs del consumidor:

```bash
docker compose logs -f consumer-signals
```

---

## Detalles de confiabilidad (opcional)
- La cola se crea como no durable y los mensajes no se marcan persistentes, así que si RabbitMQ se reinicia, los mensajes/colas se pierden.
- El consumidor usa `autoAck=true` (confirma al recibir). Si el proceso cae mientras procesa, ese mensaje podría perderse. Para más confiabilidad, usar `autoAck=false` y `basicAck()` manual.

---

## Mejoras sugeridas (futuro)
- Hacer la cola durable y los mensajes persistentes.
- Mover la config (host, user, pass) a variables de entorno.
- Agregar pruebas y logs estructurados.
- Usar un intercambio (exchange) nombrado en lugar del exchange por defecto.
