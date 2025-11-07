import { useState, useEffect } from "react";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import WelcomeScreen from "./components/WelcomeScreen";

// API en la misma URL (proxy por Nginx)
const API_URL = "/api";

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [ruta, setRuta] = useState(null);
  const [indiceActual, setIndiceActual] = useState(0);
  const [contenedorActual, setContenedorActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para iniciar el flujo completo
  const handleIniciarFlujo = async () => {
    try {
      console.log('🚀 Iniciando flujo desde frontend...');
      
      const response = await fetch(`${API_URL}/iniciar-flujo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.ruta) {
        console.log('✅ Flujo completado, ruta recibida');
        setRuta(data.ruta);
        setContenedorActual(data.ruta.ruta[0]);
        setIndiceActual(0);
        setShowWelcome(false);
        setError(null);
        return true;
      } else {
        throw new Error(data.message || 'Error iniciando flujo');
      }
    } catch (err) {
      console.error('❌ Error en handleIniciarFlujo:', err);
      throw err;
    }
  };

  // Obtener la ruta completa al iniciar (solo si no estamos en welcome)
  useEffect(() => {
    if (showWelcome) return;

    const obtenerRuta = async (esInicial = false) => {
      try {
        if (esInicial) {
          setLoading(true);
        }
        
        const response = await fetch(`${API_URL}/ruta`);
        
        if (!response.ok) {
          throw new Error('No hay rutas disponibles aún');
        }
        
        const data = await response.json();
        
        if (data.success && data.data.ruta && data.data.ruta.length > 0) {
          setRuta(data.data);
          
          // Solo resetear el índice en la carga inicial, no en polling
          if (esInicial) {
            setContenedorActual(data.data.ruta[0]);
            setIndiceActual(0);
          }
          
          setError(null);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error obteniendo ruta:', err);
      } finally {
        if (esInicial) {
          setLoading(false);
        }
      }
    };

    // Obtener ruta inicial
    obtenerRuta(true);
    
    // Ya NO hacemos polling porque causa re-renders innecesarios
    // La ruta se obtiene solo una vez cuando se carga la página
    
  }, [showWelcome]);

  const siguiente = () => {
    console.log('🔍 Botón siguiente presionado');
    console.log('Ruta actual:', ruta);
    console.log('Índice actual:', indiceActual);
    
    if (!ruta || !ruta.ruta) {
      console.error('❌ No hay ruta disponible');
      alert('No hay ruta disponible');
      return;
    }
    
    const nuevoIndice = indiceActual + 1;
    
    if (nuevoIndice >= ruta.ruta.length) {
      console.log('⚠️ Ya estás en el último contenedor');
      return; // Ya estamos en el último, usar el botón Finalizar
    }
    
    // Mostrar mensaje de contenedor recogido
    const contenedorActualInfo = ruta.ruta[indiceActual];
    console.log(`✅ Contenedor ${contenedorActualInfo.id} recogido (${contenedorActualInfo.porcentaje}%)`);
    console.log(`➡️ Avanzando al contenedor ${nuevoIndice + 1} de ${ruta.ruta.length}`);
    
    setIndiceActual(nuevoIndice);
    setContenedorActual(ruta.ruta[nuevoIndice]);
  };

  const finalizarRuta = async () => {
    if (!ruta || !ruta.ruta) {
      return;
    }

    const confirmacion = window.confirm(
      `🎉 ¿Finalizar la ruta?\n\n` +
      `Se han recogido ${ruta.ruta.length} contenedores.\n` +
      `Tiempo total: ${ruta.tiempo_total_minutos} minutos.\n\n` +
      `Los contenedores serán marcados como vacíos.`
    );

    if (!confirmacion) {
      return;
    }

    try {
      // Llamar al backend para vaciar los contenedores
      const response = await fetch(`${API_URL}/ruta/completar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ¡Ruta finalizada exitosamente!\n\n${data.message}`);
        // Resetear el estado y volver al inicio
        setRuta(null);
        setContenedorActual(null);
        setIndiceActual(0);
        setShowWelcome(true);
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error finalizando ruta:', error);
      alert('❌ Error al finalizar la ruta. Intenta nuevamente.');
    }
  };

  // Mostrar welcome screen primero
  if (showWelcome) {
    return <WelcomeScreen onStart={handleIniciarFlujo} />;
  }

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>⏳ Cargando ruta...</h2>
        <p>Esperando cálculo de ruta óptima desde el backend</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>⚠️ {error}</h2>
        <p>Ejecuta el flujo completo del sistema para generar una ruta.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Panel de información mejorado */}
      <div style={{ 
        background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
        color: "white",
        padding: "28px",
        borderRadius: "16px",
        marginBottom: "24px",
        boxShadow: "0 10px 30px rgba(5, 150, 105, 0.3)"
      }}>
        <h1 style={{ margin: "0 0 20px 0", fontSize: "32px", fontWeight: "700", letterSpacing: "-0.5px" }}>
          Ruta de Recolección
        </h1>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "16px",
          marginTop: "20px"
        }}>
          <div style={{ 
            backgroundColor: "rgba(255,255,255,0.15)", 
            padding: "16px", 
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)"
          }}>
            <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px", fontWeight: "500" }}>Parada Actual</div>
            <div style={{ fontSize: "36px", fontWeight: "700" }}>
              {indiceActual + 1} <span style={{ fontSize: "20px", opacity: "0.8" }}>/ {ruta?.ruta?.length || 0}</span>
            </div>
          </div>
          
          {contenedorActual && (
            <>
              <div style={{ 
                backgroundColor: "rgba(255,255,255,0.15)", 
                padding: "16px", 
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)"
              }}>
                <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px", fontWeight: "500" }}>Contenedor ID</div>
                <div style={{ fontSize: "36px", fontWeight: "700" }}>{contenedorActual.id}</div>
              </div>
              
              <div style={{ 
                backgroundColor: "rgba(255,255,255,0.15)", 
                padding: "16px", 
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)"
              }}>
                <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px", fontWeight: "500" }}>Llenado</div>
                <div style={{ fontSize: "36px", fontWeight: "700", color: "#fbbf24" }}>{contenedorActual.porcentaje}%</div>
              </div>
            </>
          )}
          
          <div style={{ 
            backgroundColor: "rgba(255,255,255,0.15)", 
            padding: "16px", 
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)"
          }}>
            <div style={{ fontSize: "14px", opacity: "0.9", marginBottom: "8px", fontWeight: "500" }}>Tiempo Total</div>
            <div style={{ fontSize: "36px", fontWeight: "700" }}>{ruta?.tiempo_total_minutos || 0}<span style={{ fontSize: "18px", opacity: "0.8" }}> min</span></div>
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div style={{ marginTop: "24px" }}>
          <div style={{ fontSize: "14px", marginBottom: "10px", opacity: "0.95", fontWeight: "500" }}>
            Progreso de la ruta
          </div>
          <div style={{ 
            backgroundColor: "rgba(255,255,255,0.25)", 
            borderRadius: "10px", 
            height: "14px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.3)"
          }}>
            <div style={{ 
              backgroundColor: "#fbbf24",
              width: `${((indiceActual + 1) / (ruta?.ruta?.length || 1)) * 100}%`,
              height: "100%",
              transition: "width 0.5s ease",
              borderRadius: "10px",
              boxShadow: "0 0 10px rgba(251, 191, 36, 0.5)"
            }}></div>
          </div>
        </div>
      </div>
      
      <MapView ruta={ruta} indiceActual={indiceActual} />
      <ControlPanel 
        onNext={siguiente}
        onFinalizar={finalizarRuta}
        esUltimo={indiceActual === (ruta?.ruta?.length - 1)}
      />
    </div>
  );
}

export default App;

