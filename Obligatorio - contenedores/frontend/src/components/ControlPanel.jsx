export default function ControlPanel({ onNext, esUltimo, onFinalizar }) {
  const handleNextClick = () => {
    console.log('🔘 Botón "Siguiente Contenedor" clickeado');
    console.log('onNext función:', onNext);
    console.log('esUltimo:', esUltimo);
    if (onNext) {
      onNext();
    } else {
      console.error('❌ onNext no está definido');
    }
  };

  const handleFinalizarClick = () => {
    console.log('🔘 Botón "Finalizar Ruta" clickeado');
    if (onFinalizar) {
      onFinalizar();
    } else {
      console.error('❌ onFinalizar no está definido');
    }
  };

  const buttonStyle = {
    padding: "16px 40px",
    fontSize: "17px",
    fontWeight: "600",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontFamily: "'Inter', system-ui, sans-serif"
  };

  const siguienteStyle = {
    ...buttonStyle,
    backgroundColor: "#10b981",
    color: "white"
  };

  const finalizarStyle = {
    ...buttonStyle,
    backgroundColor: "#fbbf24",
    color: "#047857"
  };

  return (
    <div style={{ 
      marginTop: "28px", 
      textAlign: "center",
      paddingBottom: "24px"
    }}>
      {!esUltimo ? (
        <button
          onClick={handleNextClick}
          style={siguienteStyle}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#059669";
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 8px 24px rgba(16, 185, 129, 0.4)";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#10b981";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
          }}
        >
          Siguiente Contenedor
        </button>
      ) : (
        <button
          onClick={handleFinalizarClick}
          style={finalizarStyle}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#fcd34d";
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 8px 24px rgba(251, 191, 36, 0.5)";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#fbbf24";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
          }}
        >
          Finalizar Ruta
        </button>
      )}
    </div>
  );
}
