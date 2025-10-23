export default function ControlPanel({ onNext }) {
  return (
    <div style={{ marginTop: "1rem", textAlign: "center" }}>
      <button
        onClick={onNext}
        style={{
          backgroundColor: "#000000ff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
       Obtener siguiente contenedor
      </button>
    </div>
  );
}
