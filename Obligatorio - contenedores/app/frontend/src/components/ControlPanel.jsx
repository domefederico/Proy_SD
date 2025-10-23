export default function ControlPanel({ onNext, esUltimo }) {
  return (
    <div style={{ marginTop: "1rem", textAlign: "center" }}>
      <button
        onClick={onNext}
        disabled={esUltimo}
        style={{
          backgroundColor: esUltimo ? "#cccccc" : "#000000ff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          cursor: esUltimo ? "not-allowed" : "pointer",
          fontSize: "16px"
        }}
      >
        {esUltimo ? "✅ Ruta Completada" : "➡️ Siguiente Contenedor"}
      </button>
    </div>
  );
}
