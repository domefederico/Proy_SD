import amqp from 'amqplib';
import { RABBITMQ_URL, QUEUE_NAMES } from '../config/rabbitmq.js';

/**
 * Inicia un consumer en segundo plano para escuchar rutas calculadas
 * Actualiza la variable global ultimaRuta cuando llega una nueva ruta
 */
export async function iniciarConsumerRutas(onRutaRecibida) {
  try {
    console.log('🐰 Conectando a RabbitMQ para escuchar rutas...');
    
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    await channel.assertQueue(QUEUE_NAMES.CONTAINERS_TO_CLEAN, { durable: false });
    
    console.log(`✅ Escuchando cola: ${QUEUE_NAMES.CONTAINERS_TO_CLEAN}`);
    console.log('📥 Esperando rutas calculadas...\n');
    
    channel.consume(QUEUE_NAMES.CONTAINERS_TO_CLEAN, (msg) => {
      if (msg !== null) {
        const mensaje = msg.content.toString();
        
        try {
          const ruta = JSON.parse(mensaje);
          
          console.log('═══════════════════════════════════════════');
          console.log('🗺️  NUEVA RUTA RECIBIDA');
          console.log('═══════════════════════════════════════════');
          console.log(`📦 Contenedores: ${ruta.cantidad_contenedores}`);
          console.log(`⏱️  Tiempo: ${ruta.tiempo_total_minutos} minutos`);
          console.log('═══════════════════════════════════════════\n');
          
          // Callback para actualizar la ruta en el servidor
          if (onRutaRecibida) {
            onRutaRecibida(ruta);
          }
          
        } catch (error) {
          console.error('❌ Error parseando mensaje:', error);
        }
        
        channel.ack(msg);
      }
    });
    
  } catch (error) {
    console.error('❌ Error conectando a RabbitMQ:', error.message);
    console.log('🔄 Reintentando en 5 segundos...');
    setTimeout(() => iniciarConsumerRutas(onRutaRecibida), 5000);
  }
}
