import amqp from 'amqplib';
import pg from 'pg';
import { RABBITMQ_URL, QUEUE_NAMES } from './config/rabbitmq.js';

const { Pool } = pg;

// Cliente PostgreSQL para guardar rutas
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mi_base',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234'
});

console.log('═══════════════════════════════════════════');
console.log('🗺️  Route Consumer - Servicio iniciado');
console.log('═══════════════════════════════════════════\n');

/**
 * Escucha rutas calculadas desde RabbitMQ y las guarda en Redis
 */
async function iniciarConsumer() {
  try {
    console.log('🐰 Conectando a RabbitMQ...');
    
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    await channel.assertQueue(QUEUE_NAMES.CONTAINERS_TO_CLEAN, { durable: false });
    
    console.log(`✅ Conectado a RabbitMQ`);
    console.log(`📥 Escuchando cola: ${QUEUE_NAMES.CONTAINERS_TO_CLEAN}\n`);
    
    channel.consume(QUEUE_NAMES.CONTAINERS_TO_CLEAN, async (msg) => {
      if (msg !== null) {
        const mensaje = msg.content.toString();
        
        try {
          const ruta = JSON.parse(mensaje);
          
          console.log('═══════════════════════════════════════════');
          console.log('🗺️  NUEVA RUTA RECIBIDA');
          console.log('═══════════════════════════════════════════');
          console.log(`📦 Contenedores: ${ruta.cantidad_contenedores}`);
          console.log(`⏱️  Tiempo: ${ruta.tiempo_total_minutos} minutos`);
          console.log(`📍 Ruta: [${ruta.ruta.map(c => c.id).join(' → ')}]`);
          console.log('═══════════════════════════════════════════\n');
          
          // Guardar en PostgreSQL
          await pool.query(
            'INSERT INTO rutas (cantidad_contenedores, tiempo_total_minutos, ruta) VALUES ($1, $2, $3)',
            [ruta.cantidad_contenedores, ruta.tiempo_total_minutos, JSON.stringify(ruta.ruta)]
          );
          console.log('✅ Ruta guardada en PostgreSQL\n');
          
        } catch (error) {
          console.error('❌ Error parseando mensaje:', error);
        }
        
        channel.ack(msg);
      }
    });
    
  } catch (error) {
    console.error('❌ Error conectando a RabbitMQ:', error.message);
    console.log('🔄 Reintentando en 5 segundos...\n');
    setTimeout(iniciarConsumer, 5000);
  }
}

iniciarConsumer();
