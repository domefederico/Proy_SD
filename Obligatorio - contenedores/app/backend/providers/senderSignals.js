import amqp from 'amqplib';
import pg from 'pg';
import { RABBITMQ_URL, QUEUE_NAMES } from '../config/rabbitmq.js';
import { DB_CONFIG } from '../config/database.js';

const { Client } = pg;

/**
 * Simula el envío de señales de 15 sensores
 * GARANTIZA que al menos 8 contenedores ALEATORIOS queden >= 75% llenos
 */
export async function ejecutarSenderSignals() {
  let connection;
  let channel;
  let dbClient;

  try {
    console.log('📡 Paso 1/3: Simulando 15 sensores enviando datos...');

    // Conectar a la base de datos
    dbClient = new Client(DB_CONFIG);
    await dbClient.connect();

    // Consultar los 15 contenedores de la BD
    const query = 'SELECT id, latitud, longitud, porcentaje FROM contenedores ORDER BY id LIMIT 15';
    const result = await dbClient.query(query);

    if (result.rows.length === 0) {
      console.log('⚠️  No hay contenedores en la base de datos');
      return;
    }

    // Seleccionar 8 contenedores ALEATORIOS para llenar
    const indicesDisponibles = Array.from({ length: result.rows.length }, (_, i) => i);
    const indicesALlenar = [];
    
    // Algoritmo de Fisher-Yates para selección aleatoria
    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * indicesDisponibles.length);
      indicesALlenar.push(indicesDisponibles[randomIndex]);
      indicesDisponibles.splice(randomIndex, 1);
    }

    console.log(`🎲 Contenedores seleccionados para llenar: [${indicesALlenar.map(i => result.rows[i].id).sort((a,b) => a-b).join(', ')}]`);

    // Conectar a RabbitMQ
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAMES.SIGNALS, { durable: false });

    // Procesar cada contenedor
    for (let i = 0; i < result.rows.length; i++) {
      const contenedor = result.rows[i];
      let nuevoPorcentaje;

      if (indicesALlenar.includes(i)) {
        // Este contenedor fue SELECCIONADO para llenarse (>= 75%)
        if (contenedor.porcentaje < 75) {
          // Forzar a un valor entre 75-100%
          const minimo = 75;
          const maximo = 100;
          nuevoPorcentaje = Math.floor(Math.random() * (maximo - minimo + 1)) + minimo;
        } else {
          // Ya está lleno, sumar un poco más (sin pasar de 100)
          const incremento = Math.floor(Math.random() * 5) + 1;
          nuevoPorcentaje = Math.min(contenedor.porcentaje + incremento, 100);
        }
      } else {
        // Los demás contenedores: incremento aleatorio normal (1-5%)
        const incremento = Math.floor(Math.random() * 5) + 1;
        nuevoPorcentaje = Math.min(contenedor.porcentaje + incremento, 100);
      }

      // Crear mensaje con todos los datos del contenedor
      const sensorData = {
        id: contenedor.id,
        latitud: parseFloat(contenedor.latitud),
        longitud: parseFloat(contenedor.longitud),
        porcentaje: nuevoPorcentaje
      };

      // Enviar a la cola
      channel.sendToQueue(
        QUEUE_NAMES.SIGNALS,
        Buffer.from(JSON.stringify(sensorData)),
        { persistent: false }
      );

      const estado = nuevoPorcentaje >= 75 ? '🔴' : '🟢';
      console.log(`  ${estado} Sensor ${contenedor.id} activado (${contenedor.porcentaje}% → ${nuevoPorcentaje}%)`);
    }

    console.log(`✅ ${result.rows.length} sensores completados\n`);

  } catch (error) {
    console.error('❌ Error en ejecutarSenderSignals:', error.message);
    throw error;
  } finally {
    // Cerrar conexiones
    if (channel) await channel.close();
    if (connection) await connection.close();
    if (dbClient) await dbClient.end();
  }
}
