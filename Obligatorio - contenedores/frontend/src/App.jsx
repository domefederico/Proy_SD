import { useState, useEffect } from "react";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";

function App() {
  const [contenedor, setContenedor] = useState(null);

  // 🔧 Esto es solo para probar sin backend
  useEffect(() => {
    setContenedor({ id: 1, latitud: -34.9011, longitud: -56.1645 }); // Montevideo
  }, []);

  const siguiente = () => {
    alert("Simulando llegada al siguiente contenedor 🚚");
  };

  return (
  <div className="container">
    <MapView contenedor={contenedor} />
    <ControlPanel onNext={siguiente} />
  </div>
);

}

export default App;
