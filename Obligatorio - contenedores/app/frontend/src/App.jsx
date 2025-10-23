import { useState, useEffect } from "react";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";

// API en la misma URL (proxy por Nginx)
const API_URL = "/api";

function App() {
  const [ruta, setRuta] = useState(null);
  const [indiceActual, setIndiceActual] = useState(0);
  const [contenedorActual, setContenedorActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtener la ruta completa al iniciar
  useEffect(() => {
    const obtenerRuta = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/ruta`);
        
        if (!response.ok) {
          throw new Error('No hay rutas disponibles aún');
        }
        
        const data = await response.json();
        
        if (data.success && data.data.ruta && data.data.ruta.length > 0) {
          setRuta(data.data);
          setContenedorActual(data.data.ruta[0]);
          setIndiceActual(0);
          setError(null);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error obteniendo ruta:', err);
      } finally {
        setLoading(false);
      }
    };

    obtenerRuta();
    
    // Polling cada 5 segundos para ver si hay nueva ruta
    const interval = setInterval(obtenerRuta, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const siguiente = () => {
    if (!ruta || !ruta.ruta) {
      alert('No hay ruta disponible');
      return;
    }
    
    const nuevoIndice = indiceActual + 1;
    
    if (nuevoIndice >= ruta.ruta.length) {
      alert('🎉 ¡Ruta completada! Todos los contenedores recogidos.');
      return;
    }
    
    setIndiceActual(nuevoIndice);
    setContenedorActual(ruta.ruta[nuevoIndice]);
  };

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
    <div className="container">
      <div style={{ padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '8px', marginBottom: '1rem' }}>
        <h2>🚛 Ruta de Recolección</h2>
        <p>
          <strong>Contenedor actual:</strong> {indiceActual + 1} de {ruta?.ruta?.length || 0}
          {contenedorActual && (
            <>
              <br />
              <strong>ID:</strong> {contenedorActual.id} | 
              <strong> Llenado:</strong> {contenedorActual.porcentaje}%
            </>
          )}
        </p>
        <p>
          <strong>Tiempo total estimado:</strong> {ruta?.tiempo_total_minutos || 0} minutos
        </p>
      </div>
      
      <MapView contenedor={contenedorActual} />
      <ControlPanel 
        onNext={siguiente} 
        esUltimo={indiceActual === (ruta?.ruta?.length - 1)}
      />
    </div>
  );
}

export default App;

