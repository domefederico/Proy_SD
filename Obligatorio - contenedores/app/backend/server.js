import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { ejecutarSenderSignals } from './providers/senderSignals.js';
import { ejecutarProviderFullContainers } from './providers/providerFullContainers.js';
import { iniciarConsumerRutas } from './services/routeConsumer.js';
import { DB_CONFIG } from './config/database.js';

const { Client } = pg;

const app = express();
const PORT = 4000;

// Variable global para almacenar la última ruta calculada
let ultimaRuta = null;

// Middleware
app.use(cors());
app.use(express.json());

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

// POST /api/ruta/completar - Finalizar ruta y vaciar contenedores
app.post('/api/ruta/completar', async (req, res) => {
  try {
    if (!ultimaRuta || !ultimaRuta.ruta) {
      return res.status(404).json({
        success: false,
        message: 'No hay ruta activa para completar'
      });
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('🏁 FINALIZANDO RUTA');
    console.log('═══════════════════════════════════════════\n');

    // Obtener los IDs de los contenedores de la ruta
    const contenedorIds = ultimaRuta.ruta.map(c => c.id);
    
    console.log(`📦 Vaciando ${contenedorIds.length} contenedores: [${contenedorIds.join(', ')}]`);

    // Conectar a la base de datos
    const dbClient = new Client(DB_CONFIG);
    await dbClient.connect();

    try {
      // Actualizar porcentaje a 0 para todos los contenedores de la ruta
      const query = `
        UPDATE contenedores 
        SET porcentaje = 0 
        WHERE id = ANY($1::int[])
        RETURNING id, porcentaje
      `;
      
      const result = await dbClient.query(query, [contenedorIds]);

      console.log(`✅ ${result.rowCount} contenedores vaciados exitosamente\n`);

      // Mostrar detalles
      result.rows.forEach(row => {
        console.log(`  🗑️  Contenedor ${row.id}: ${row.porcentaje}%`);
      });

      console.log('\n═══════════════════════════════════════════\n');

      // Limpiar la ruta actual
      ultimaRuta = null;

      res.json({
        success: true,
        message: `Ruta completada. ${result.rowCount} contenedores vaciados.`,
        contenedoresVaciados: result.rows
      });

    } finally {
      await dbClient.end();
    }

  } catch (error) {
    console.error('\n❌ ERROR FINALIZANDO RUTA:', error.message);
    console.error('═══════════════════════════════════════════\n');
    res.status(500).json({
      success: false,
      message: 'Error al completar la ruta',
      error: error.message
    });
  }
});

// POST /api/iniciar-flujo - Iniciar todo el flujo automáticamente
app.post('/api/iniciar-flujo', async (req, res) => {
  try {
    console.log('\n═══════════════════════════════════════════');
    console.log('🚀 INICIANDO FLUJO AUTOMÁTICO DESDE BACKEND');
    console.log('═══════════════════════════════════════════\n');

    // Limpiar ruta anterior
    ultimaRuta = null;

    // Paso 1: Ejecutar sender-signals (envía 15 señales a la cola)
    console.log('📡 Paso 1/3: Ejecutando sender-signals...');
    await ejecutarSenderSignals();
    console.log('✅ Sender-signals completado\n');

    // Esperar a que consumer-signals procese las señales
    console.log('⏳ Esperando procesamiento de señales (5 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Paso 2: Ejecutar provider-full-containers (consulta BD y envía contenedores)
    console.log('🗄️ Paso 2/3: Ejecutando provider-full-containers...');
    const cantidadEnviada = await ejecutarProviderFullContainers();
    console.log(`✅ Provider-full-containers completado (${cantidadEnviada} contenedores)\n`);

    // Paso 3: Esperar a que se calcule la ruta (máximo 30 segundos)
    console.log('⏳ Paso 3/3: Esperando cálculo de ruta óptima...');
    let intentos = 0;
    while (!ultimaRuta && intentos < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      intentos++;
      if (intentos % 5 === 0) {
        console.log(`  ⏱️  ${intentos} segundos transcurridos...`);
      }
    }

    if (ultimaRuta) {
      console.log('✅ ¡Ruta calculada exitosamente!\n');
      console.log(`📊 Resultado: ${ultimaRuta.ruta.length} contenedores, ${ultimaRuta.tiempo_total_minutos} minutos\n`);
      console.log('═══════════════════════════════════════════\n');
      
      res.json({
        success: true,
        message: 'Flujo completado exitosamente',
        ruta: ultimaRuta
      });
    } else {
      throw new Error('Timeout: La ruta no se calculó en el tiempo esperado (30s)');
    }

  } catch (error) {
    console.error('\n❌ ERROR EN EL FLUJO:', error.message);
    console.error('═══════════════════════════════════════════\n');
    res.status(500).json({
      success: false,
      message: 'Error ejecutando el flujo',
      error: error.message
    });
  }
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
  
  // Iniciar consumer de RabbitMQ para escuchar rutas
  iniciarConsumerRutas((ruta) => {
    ultimaRuta = ruta;
  });
});
