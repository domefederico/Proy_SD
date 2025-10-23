import express from 'express';
import cors from 'cors';
import amqp from 'amqplib';

const app = express();
const PORT = 4000;

// Configuración de RabbitMQ
const RABBITMQ_URL = 'amqp://user:pass@rabbitmq:5672';
const QUEUE_NAME = 'containerstoclean';

// Variable global para almacenar la última ruta calculada
let ultimaRuta = null;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// CONSUMER DE RABBITMQ EN SEGUNDO PLANO
// ============================================
async function iniciarConsumerRabbitMQ() {
  try {
    console.log('🐰 Conectando a RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    await channel.assertQueue(QUEUE_NAME, { durable: false });
    
    console.log(`✅ Escuchando cola: ${QUEUE_NAME}`);
    console.log('📥 Esperando rutas calculadas...\n');
    
    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        const mensaje = msg.content.toString();
        
        try {
          const ruta = JSON.parse(mensaje);
          ultimaRuta = ruta;
          
          console.log('═══════════════════════════════════════════');
          console.log('🗺️  NUEVA RUTA RECIBIDA');
          console.log('═══════════════════════════════════════════');
          console.log(`📦 Contenedores: ${ruta.cantidad_contenedores}`);
          console.log(`⏱️  Tiempo: ${ruta.tiempo_total_minutos} minutos`);
          console.log('═══════════════════════════════════════════\n');
          
        } catch (error) {
          console.error('❌ Error parseando mensaje:', error);
        }
        
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('❌ Error conectando a RabbitMQ:', error.message);
    console.log('🔄 Reintentando en 5 segundos...');
    setTimeout(iniciarConsumerRabbitMQ, 5000);
  }
}

// ============================================
// ENDPOINTS REST API
// ============================================

// GET /api/ruta - Obtener la última ruta calculada
app.get('/api/ruta', (req, res) => {
  if (ultimaRuta) {
    res.json({
      success: true,
      data: ultimaRuta
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'No hay rutas disponibles aún'
    });
  }
});

// GET /api/ruta/siguiente/:index - Obtener contenedor específico de la ruta
app.get('/api/ruta/siguiente/:index', (req, res) => {
  const index = parseInt(req.params.index);
  
  if (!ultimaRuta) {
    return res.status(404).json({
      success: false,
      message: 'No hay rutas disponibles'
    });
  }
  
  if (index < 0 || index >= ultimaRuta.ruta.length) {
    return res.status(400).json({
      success: false,
      message: 'Índice fuera de rango'
    });
  }
  
  const contenedor = ultimaRuta.ruta[index];
  
  res.json({
    success: true,
    data: {
      contenedor: contenedor,
      posicion: index + 1,
      total: ultimaRuta.ruta.length,
      esUltimo: index === ultimaRuta.ruta.length - 1
    }
  });
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    tieneRuta: ultimaRuta !== null,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════');
  console.log('🚀 Backend API iniciado');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════\n');
  
  // Iniciar consumer de RabbitMQ
  iniciarConsumerRabbitMQ();
});
