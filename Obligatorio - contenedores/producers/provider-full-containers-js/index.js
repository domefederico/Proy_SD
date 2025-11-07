import amqp from 'amqplib';
import pg from 'pg';
import { RABBITMQ_URL, QUEUE_NAMES } from './config/rabbitmq.js';
import { DB_CONFIG } from './config/database.js';

const { Client } = pg;

console.log('═══════════════════════════════════════════');
console.log('🗄️ Provider Full Containers - Servicio iniciado');
console.log('═══════════════════════════════════════════\n');

/**
 * Consulta PostgreSQL por contenedores llenos y los publica a RabbitMQ
 * @returns {Promise<{hasContainers: boolean, count: number}>}
 */
async function consultarYPublicarContenedores() {
  let connection = null;
  let channel = null;
  let dbClient = null;
  
  try {
    console.log('🗄️ Consultando contenedores llenos desde PostgreSQL...\n');
    
    // Conectar a PostgreSQL
    dbClient = new Client(DB_CONFIG);
    await dbClient.connect();
    console.log('✅ Conectado a PostgreSQL\n');
    
    // Consultar contenedores con porcentaje >= 75%
    const query = `
      SELECT id, latitud, longitud, porcentaje 
      FROM contenedores 
      WHERE porcentaje >= 75 
      ORDER BY id
    `;
    const result = await dbClient.query(query);
    
    if (result.rows.length === 0) {
      console.log('⚠️  No hay contenedores llenos para procesar\n');
      return { hasContainers: false, count: 0 };
    }
    
    console.log(`📊 Encontrados ${result.rows.length} contenedores llenos\n`);
    
    // Conectar a RabbitMQ
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAMES.FULL_CONTAINERS, { durable: false });
    console.log('✅ Conectado a RabbitMQ\n');
    
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
      
      console.log(`  📦 Contenedor ${row.id} | ${row.porcentaje}% | (${row.latitud}, ${row.longitud})`);
    }
    
    console.log(`\n✅ ${result.rows.length} contenedores publicados a RabbitMQ`);
    
    // Enviar señal de finalización (id: -1)
    const processSignal = {
      id: -1,
      timestamp: new Date().toISOString()
    };
    
    channel.sendToQueue(
      QUEUE_NAMES.FULL_CONTAINERS,
      Buffer.from(JSON.stringify(processSignal)),
      { persistent: false }
    );
    
    console.log('📤 Señal de cálculo enviada (id: -1)\n');
    console.log('═══════════════════════════════════════════\n');
    
    return { hasContainers: true, count: result.rows.length };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (channel) await channel.close();
    if (connection) await connection.close();
    if (dbClient) await dbClient.end();
  }
}

import express from 'express';

const app = express();
const PORT = 3003;

app.use(express.json());

/**
 * Endpoint HTTP para activar la consulta de contenedores llenos
 * Se dispara cuando el usuario hace clic en "Comenzar"
 */
app.post('/consultar-contenedores', async (req, res) => {
  try {
    console.log('\n🚀 Solicitud recibida: Consultando contenedores llenos\n');
    
    // Ejecutar la consulta y publicación (esperar resultado)
    const result = await consultarYPublicarContenedores();
    
    res.json({ 
      success: true, 
      message: result.hasContainers 
        ? `Consulta completada: ${result.count} contenedores encontrados`
        : 'No hay contenedores llenos en este momento',
      hasContainers: result.hasContainers,
      count: result.count
    });
  } catch (error) {
    console.error('❌ Error en endpoint:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'provider-full-containers' });
});

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP escuchando en puerto ${PORT}`);
  console.log('📡 Esperando solicitudes POST /consultar-contenedores\n');
  console.log('═══════════════════════════════════════════\n');
});

// Mantener el proceso vivo
setInterval(() => {}, 1000000);
