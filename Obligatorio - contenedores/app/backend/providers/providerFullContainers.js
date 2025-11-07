import amqp from 'amqplib';
import pg from 'pg';
import { RABBITMQ_URL, QUEUE_NAMES } from '../config/rabbitmq.js';
import { DB_CONFIG } from '../config/database.js';

const { Client } = pg;

/**
 * Simula el comportamiento de provider-full-containers
 * Consulta la BD por contenedores llenos (>= 75%) y los envía a la cola
 */
export async function ejecutarProviderFullContainers() {
  let connection = null;
  let channel = null;
  let dbClient = null;
  
  try {
    console.log('🗄️ Paso 2/3: Consultando contenedores llenos desde la BD...');
    
    // Conectar a PostgreSQL
    dbClient = new Client(DB_CONFIG);
    await dbClient.connect();
    
    // Consultar contenedores con porcentaje >= 75%
    const query = `
      SELECT id, latitud, longitud, porcentaje 
      FROM contenedores 
      WHERE porcentaje >= 75 
      ORDER BY id
    `;
    const result = await dbClient.query(query);
    
    if (result.rows.length === 0) {
      console.log('⚠️  No hay contenedores llenos para procesar');
      return 0;
    }
    
    // Conectar a RabbitMQ
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Declarar cola
    await channel.assertQueue(QUEUE_NAMES.FULL_CONTAINERS, { durable: false });
    
    // Enviar cada contenedor a la cola
    for (const row of result.rows) {
      const containerData = {
        id: row.id,
        latitud: parseFloat(row.latitud),
        longitud: parseFloat(row.longitud),
        porcentaje: row.porcentaje
      };
      
      channel.sendToQueue(
        QUEUE_NAMES.FULL_CONTAINERS,
        Buffer.from(JSON.stringify(containerData)),
        { persistent: false }
      );
      
      console.log(`  📦 Contenedor ${row.id} | ${row.porcentaje}% | (${row.latitud}, ${row.longitud}) - Enviado`);
    }
    
    console.log(`✅ ${result.rows.length} contenedores enviados\n`);
    
    // Enviar señal de finalización (id: -1) para activar el cálculo de ruta
    const processSignal = {
      id: -1,
      timestamp: new Date().toISOString()
    };
    
    channel.sendToQueue(
      QUEUE_NAMES.FULL_CONTAINERS,
      Buffer.from(JSON.stringify(processSignal)),
      { persistent: false }
    );
    
    console.log('  📤 Señal de cálculo enviada (id: -1)');
    console.log('✅ Provider completado\n');
    
    return result.rows.length;
    
  } catch (error) {
    console.error('❌ Error en provider-full-containers:', error.message);
    throw error;
  } finally {
    // Cerrar conexiones
    if (channel) await channel.close();
    if (connection) await connection.close();
    if (dbClient) await dbClient.end();
  }
}
