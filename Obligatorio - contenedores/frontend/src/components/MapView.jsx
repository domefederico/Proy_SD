import { useRef, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { divIcon } from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import "leaflet/dist/leaflet.css";

export default function MapView({ ruta, indiceActual }) {
  const mapRef = useRef(null);
  
  // Estado para saber si ya se inicializó el mapa (evita re-renders)
  const [mapInitialized, setMapInitialized] = useState(false);

  if (!ruta?.ruta || ruta.ruta.length === 0) {
    return (
      <div style={{
        height: "600px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
        borderRadius: "12px",
        border: "2px dashed #d1d5db"
      }}>
        <p style={{ color: "#6b7280", fontSize: "18px" }}>
          📍 No hay contenedores pendientes
        </p>
      </div>
    );
  }

  // Calcular el centro SOLO UNA VEZ usando useMemo
  const center = useMemo(() => {
    const lats = ruta.ruta.map(c => c.latitud);
    const lons = ruta.ruta.map(c => c.longitud);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length;
    return [centerLat, centerLon];
  }, []); // Array vacío = solo se calcula una vez

  // Crear ícono personalizado con número
  const createNumberedIcon = (numero, isActual, isPast) => {
    const iconMarkup = renderToStaticMarkup(
      <div
        style={{
          backgroundColor: isPast ? "#94a3b8" : (isActual ? "#22c55e" : "#3b82f6"),
          color: "white",
          borderRadius: "50%",
          width: isActual ? "40px" : "32px",
          height: isActual ? "40px" : "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: isActual ? "16px" : "14px",
          border: `${isActual ? "4px" : "3px"} solid white`,
          boxShadow: isActual 
            ? "0 4px 12px rgba(34, 197, 94, 0.5)" 
            : "0 2px 4px rgba(0,0,0,0.3)",
          transition: "all 0.3s ease"
        }}
      >
        {numero}
      </div>
    );

    return divIcon({
      html: iconMarkup,
      className: "custom-marker",
      iconSize: isActual ? [40, 40] : [32, 32],
      iconAnchor: isActual ? [20, 20] : [16, 16],
    });
  };

  // Coordenadas para la polilínea
  const polylinePositions = ruta.ruta.map(c => [c.latitud, c.longitud]);

  return (
    <div style={{ position: "relative" }}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        style={{ 
          height: "600px", 
          width: "100%", 
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        
        {/* Línea conectando todos los contenedores */}
        <Polyline 
          positions={polylinePositions} 
          color="#3b82f6" 
          weight={4}
          opacity={0.6}
          dashArray="10, 10"
        />

        {/* Marcadores numerados para cada contenedor */}
        {ruta.ruta.map((contenedor, index) => {
          const isPast = index < indiceActual;
          const isActual = index === indiceActual;
          
          return (
            <Marker
              key={contenedor.id}
              position={[contenedor.latitud, contenedor.longitud]}
              icon={createNumberedIcon(index + 1, isActual, isPast)}
            >
              <Popup>
                <div style={{ textAlign: "center", minWidth: "150px" }}>
                  <strong style={{ fontSize: "16px", color: isActual ? "#22c55e" : isPast ? "#94a3b8" : "#3b82f6" }}>
                    {isPast ? "✅ Recogido" : isActual ? "📍 Actual" : "⏳ Pendiente"}
                  </strong>
                  <br />
                  <strong>Parada {index + 1}</strong> de {ruta.ruta.length}
                  <br />
                  <hr style={{ margin: "8px 0" }} />
                  🗑️ ID: <strong>{contenedor.id}</strong>
                  <br />
                  📊 Llenado: <strong>{contenedor.porcentaje}%</strong>
                  <br />
                  📍 ({contenedor.latitud.toFixed(5)}, {contenedor.longitud.toFixed(5)})
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Leyenda */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        backgroundColor: "white",
        padding: "12px 16px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        fontSize: "13px",
        zIndex: 1000
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
          <div style={{ 
            width: "16px", 
            height: "16px", 
            backgroundColor: "#94a3b8", 
            borderRadius: "50%", 
            marginRight: "8px" 
          }}></div>
          <span>Recogido</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
          <div style={{ 
            width: "16px", 
            height: "16px", 
            backgroundColor: "#22c55e", 
            borderRadius: "50%", 
            marginRight: "8px",
            boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)"
          }}></div>
          <span><strong>Actual</strong></span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ 
            width: "16px", 
            height: "16px", 
            backgroundColor: "#3b82f6", 
            borderRadius: "50%", 
            marginRight: "8px" 
          }}></div>
          <span>Pendiente</span>
        </div>
      </div>
    </div>
  );
}
