import amqp from 'amqplib';
import { RABBITMQ_URL, QUEUE_NAMES } from './config/rabbitmq.js';

console.log('═══════════════════════════════════════════');
console.log('📡 Sender Signals - Servicio iniciado');
console.log('═══════════════════════════════════════════\n');

/**
 * Genera datos aleatorios de sensores y los envía a RabbitMQ
 * GARANTIZA que al menos 8 contenedores ALEATORIOS queden >= 75% llenos
 */
async function generarYEnviarSenales() {
  let connection;
  let channel;

  try {
    console.log('📡 Generando señales de 15 sensores...\n');

    // Conectar a RabbitMQ
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAMES.SIGNALS, { durable: false });

    // 15 contenedores con coordenadas FIJAS (ubicaciones reales en Montevideo)
    const contenedores = [
      { id: 1, latitud: -34.9065, longitud: -56.2040 },
      { id: 2, latitud: -34.9060, longitud: -56.1860 },
      { id: 3, latitud: -34.9055, longitud: -56.1755 },
      { id: 4, latitud: -34.8945, longitud: -56.1645 },
      { id: 5, latitud: -34.8855, longitud: -56.1595 },
      { id: 6, latitud: -34.9225, longitud: -56.1545 },
      { id: 7, latitud: -34.9275, longitud: -56.1555 },
      { id: 8, latitud: -34.9095, longitud: -56.1365 },
      { id: 9, latitud: -34.8935, longitud: -56.1195 },
      { id: 10, latitud: -34.8935, longitud: -56.0995 },
      { id: 11, latitud: -34.8805, longitud: -56.0605 },
      { id: 12, latitud: -34.8825, longitud: -56.1630 },
      { id: 13, latitud: -34.8615, longitud: -56.2050 },
      { id: 14, latitud: -34.8715, longitud: -56.2175 },
      { id: 15, latitud: -34.8855, longitud: -56.2370 }
    ];

    // Seleccionar entre 8 y 15 contenedores ALEATORIOS para llenar >= 75%
    const cantidadALlenar = Math.floor(Math.random() * 8) + 8; // 8-15 contenedores
    const indicesDisponibles = Array.from({ length: contenedores.length }, (_, i) => i);
    const indicesALlenar = [];
    
    // Algoritmo de Fisher-Yates para selección aleatoria
    for (let i = 0; i < cantidadALlenar; i++) {
      const randomIndex = Math.floor(Math.random() * indicesDisponibles.length);
      indicesALlenar.push(indicesDisponibles[randomIndex]);
      indicesDisponibles.splice(randomIndex, 1);
    }

    const idsSeleccionados = indicesALlenar.map(i => contenedores[i].id).sort((a,b) => a-b);
    console.log(`🎲 Contenedores seleccionados para llenar (${cantidadALlenar}): [${idsSeleccionados.join(', ')}]\n`);

    // Generar y enviar señales
    for (let i = 0; i < contenedores.length; i++) {
      const contenedor = contenedores[i];
      let porcentaje;

      if (indicesALlenar.includes(i)) {
        // Contenedor SELECCIONADO: garantizar >= 75%
        porcentaje = Math.floor(Math.random() * 26) + 75; // 75-100%
      } else {
        // Contenedor NO seleccionado: 0-74%
        porcentaje = Math.floor(Math.random() * 75); // 0-74%
      }

      const sensorData = {
        id: contenedor.id,
        latitud: contenedor.latitud,
        longitud: contenedor.longitud,
        porcentaje: porcentaje
      };

      // Enviar a RabbitMQ
      channel.sendToQueue(
        QUEUE_NAMES.SIGNALS,
        Buffer.from(JSON.stringify(sensorData)),
        { persistent: false }
      );

      const estado = porcentaje >= 75 ? '🔴' : '🟢';
      console.log(`  ${estado} Sensor ${contenedor.id}: ${porcentaje}%`);
    }

    console.log(`\n✅ ${contenedores.length} señales enviadas a RabbitMQ\n`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error generando señales:', error.message);
  } finally {
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
}

// Ejecutar automáticamente cada 30 segundos
console.log('🚀 Iniciando generación automática cada 30 segundos...\n');

// Primera ejecución inmediata
generarYEnviarSenales();

// Ejecutar cada 30 segundos
setInterval(() => {
  generarYEnviarSenales();
}, 30000);
generarYEnviarSenales()
  .then(() => {
    console.log('✅ Proceso completado. El contenedor permanecerá activo.\n');
  })
  .catch((error) => {
    console.error('❌ Error en el proceso:', error.message);
    process.exit(1);
  });

