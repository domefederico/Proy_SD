import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ contenedor }) {
  if (!contenedor?.latitud) {
    return <p>No hay contenedores pendientes.</p>;
  }

  const position = [contenedor.latitud, contenedor.longitud];

  return (
    <MapContainer
      center={position}
      zoom={15}
      style={{ height: "950px", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <Marker position={position}>
        <Popup>
          🧹 Contenedor ID: {contenedor.id} <br />
          Lat: {contenedor.latitud.toFixed(5)} <br />
          Lon: {contenedor.longitud.toFixed(5)}
        </Popup>
      </Marker>
    </MapContainer>
  );
}
