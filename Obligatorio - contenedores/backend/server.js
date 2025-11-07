import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { DB_CONFIG } from './config/database.js';

const { Client } = pg;

const app = express();
const PORT = 3001;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// ENDPOINTS REST API
// ============================================

// GET /api/ruta - Obtener la última ruta calculada
app.get('/api/ruta', async (req, res) => {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    
    // Obtener la ruta más reciente
    const result = await client.query(
      'SELECT cantidad_contenedores, tiempo_total_minutos, ruta FROM rutas ORDER BY fecha_calculo DESC LIMIT 1'
    );
    
    if (result.rows.length > 0) {
      const ruta = result.rows[0];
      res.json({
        success: true,
        data: {
          cantidad_contenedores: ruta.cantidad_contenedores,
          tiempo_total_minutos: ruta.tiempo_total_minutos,
          ruta: ruta.ruta
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No hay rutas disponibles aún'
      });
    }
  } catch (error) {
    console.error('❌ Error leyendo ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ruta',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// GET /api/ruta/siguiente/:index - Obtener contenedor específico de la ruta
app.get('/api/ruta/siguiente/:index', async (req, res) => {
  const client = new Client(DB_CONFIG);
  
  try {
    const index = parseInt(req.params.index);
    await client.connect();
    
    // Obtener la ruta más reciente
    const result = await client.query(
      'SELECT ruta FROM rutas ORDER BY fecha_calculo DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay rutas disponibles'
      });
    }
    
    const rutaData = result.rows[0].ruta;
    
    if (index < 0 || index >= rutaData.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice fuera de rango'
      });
    }
    
    const contenedor = rutaData[index];
    
    res.json({
      success: true,
      data: {
        contenedor: contenedor,
        posicion: index + 1,
        total: rutaData.length,
        esUltimo: index === rutaData.length - 1
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo contenedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener contenedor',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// GET /api/health - Health check
app.get('/api/health', async (req, res) => {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    const result = await client.query('SELECT COUNT(*) FROM rutas');
    
    res.json({
      status: 'ok',
      tieneRuta: parseInt(result.rows[0].count) > 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// POST /api/ruta/completar - Finalizar ruta y vaciar contenedores
app.post('/api/ruta/completar', async (req, res) => {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    
    // Obtener la última ruta
    const rutaResult = await client.query(
      'SELECT ruta FROM rutas ORDER BY fecha_calculo DESC LIMIT 1'
    );
    
    if (rutaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay ruta activa para completar'
      });
    }

    const rutaData = rutaResult.rows[0].ruta;

    console.log('\n═══════════════════════════════════════════');
    console.log('🏁 FINALIZANDO RUTA');
    console.log('═══════════════════════════════════════════\n');

    // Obtener los IDs de los contenedores de la ruta
    const contenedorIds = rutaData.map(c => c.id);
    
    console.log(`📦 Vaciando ${contenedorIds.length} contenedores: [${contenedorIds.join(', ')}]`);

    // Actualizar porcentaje a 0 para todos los contenedores de la ruta
    const query = `
      UPDATE contenedores 
      SET porcentaje = 0 
      WHERE id = ANY($1::int[])
      RETURNING id, porcentaje
    `;
    
    const result = await client.query(query, [contenedorIds]);

    console.log(`✅ ${result.rowCount} contenedores vaciados exitosamente\n`);

    // Mostrar detalles
    result.rows.forEach(row => {
      console.log(`  🗑️  Contenedor ${row.id}: ${row.porcentaje}%`);
    });

    console.log('\n═══════════════════════════════════════════\n');

    res.json({
      success: true,
      message: `Ruta completada. ${result.rowCount} contenedores vaciados.`,
      contenedoresVaciados: result.rows
    });

  } catch (error) {
    console.error('\n❌ ERROR FINALIZANDO RUTA:', error.message);
    console.error('═══════════════════════════════════════════\n');
    res.status(500).json({
      success: false,
      message: 'Error al completar la ruta',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// POST /api/iniciar-flujo - Activa la consulta de contenedores llenos
app.post('/api/iniciar-flujo', async (req, res) => {
  console.log('\n═══════════════════════════════════════════');
  console.log('🚀 COMENZAR - Consultando contenedores llenos');
  console.log('═══════════════════════════════════════════\n');

  let client = null;

  try {
    // Activar consulta de contenedores llenos
    console.log('🗄️  Activando provider-full-containers...');
    const containersRes = await fetch('http://provider-full-containers:3003/consultar-contenedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!containersRes.ok) {
      throw new Error(`provider-full-containers error: ${containersRes.status}`);
    }
    
    const containersData = await containersRes.json();
    
    // Verificar si hay contenedores llenos
    if (!containersData.hasContainers) {
      console.log('⚠️  No hay contenedores llenos en este momento\n');
      return res.json({
        success: false,
        message: 'No hay contenedores que necesiten vaciarse en este momento. Los contenedores se están llenando automáticamente cada 30 segundos.',
        noContainers: true
      });
    }
    
    console.log(`✅ ${containersData.count} contenedores llenos consultados y publicados\n`);

    console.log('⏳ Esperando cálculo de ruta (máximo 10 segundos)...\n');

    // Esperar a que se calcule la ruta (polling)
    let ruta = null;
    let intentos = 0;
    const maxIntentos = 20; // 10 segundos (20 * 500ms)
    const tiempoInicio = Date.now();

    client = new Client(DB_CONFIG);
    await client.connect();

    while (intentos < maxIntentos && !ruta) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Esperar 500ms
      
      const result = await client.query(
        'SELECT cantidad_contenedores, tiempo_total_minutos, ruta, fecha_calculo FROM rutas ORDER BY fecha_calculo DESC LIMIT 1'
      );

      if (result.rows.length > 0) {
        const rutaData = result.rows[0];
        const fechaRuta = new Date(rutaData.fecha_calculo);
        
        // Verificar que la ruta se haya creado DESPUÉS de que iniciamos el flujo
        if (fechaRuta.getTime() >= tiempoInicio) {
          console.log(`✅ Ruta encontrada después de ${((Date.now() - tiempoInicio) / 1000).toFixed(1)}s`);
          ruta = {
            cantidad_contenedores: rutaData.cantidad_contenedores,
            tiempo_total_minutos: parseFloat(rutaData.tiempo_total_minutos),
            ruta: rutaData.ruta // Ya es un objeto, no necesita JSON.parse()
          };
          break;
        }
      }
      
      intentos++;
    }

    await client.end();

    if (ruta) {
      console.log('═══════════════════════════════════════════');
      console.log(`✅ RUTA CALCULADA - ${ruta.cantidad_contenedores} contenedores`);
      console.log('═══════════════════════════════════════════\n');

      res.json({
        success: true,
        message: 'Ruta calculada exitosamente',
        ruta: ruta
      });
    } else {
      console.log('⚠️  Timeout esperando ruta\n');
      res.json({
        success: true,
        message: 'Flujo iniciado pero la ruta aún no está lista. Por favor espera unos segundos.',
        timeout: true
      });
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('═══════════════════════════════════════════\n');
    if (client) {
      try {
        await client.end();
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }
    res.status(500).json({
      success: false,
      message: 'Error iniciando el flujo',
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
});
