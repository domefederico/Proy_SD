import { useState } from 'react';

export default function WelcomeScreen({ onStart }) {
    const [loading, setLoading] = useState(false);

    const handleStart = async () => {
        setLoading(true);
        await onStart();
    };

    return (
        <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
        }}>
        <div style={{
            textAlign: 'center',
            color: 'white',
            maxWidth: '700px'
        }}>
            {/* Logo */}
            <div style={{
            marginBottom: '40px',
            animation: 'fadeInDown 1s ease-out'
            }}>
            <img 
                src="/emptytrash.png" 
                alt="EmptyTrash Logo" 
                style={{
                    width: '200px',
                    height: '200px',
                    objectFit: 'contain',
                    marginBottom: '30px',
                    filter: 'drop-shadow(0 10px 30px rgba(251, 191, 36, 0.3))',
                    animation: 'float 3s ease-in-out infinite'
                }}
            />
            <h1 style={{
                fontSize: '72px',
                fontWeight: '800',
                margin: '0',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                letterSpacing: '-1px',
                textShadow: '0 4px 12px rgba(0,0,0,0.3)',
                color: '#ffffff'
            }}>
                EmptyTrash
            </h1>
            <p style={{
                fontSize: '22px',
                marginTop: '20px',
                opacity: '0.95',
                fontWeight: '400',
                letterSpacing: '0.5px',
                color: '#d1fae5',
                marginBottom: '50px'
            }}>
                Sistema Inteligente de Recolección de Residuos
            </p>
            </div>

            {/* Botón de inicio */}
            {!loading ? (
            <button
                onClick={handleStart}
                style={{
                backgroundColor: '#fbbf24',
                color: '#047857',
                border: 'none',
                borderRadius: '14px',
                padding: '18px 48px',
                fontSize: '20px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(251, 191, 36, 0.4)',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontFamily: '"Inter", system-ui, sans-serif'
                }}
                onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.03)';
                e.target.style.boxShadow = '0 15px 40px rgba(251, 191, 36, 0.5)';
                e.target.style.backgroundColor = '#fcd34d';
                }}
                onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 10px 30px rgba(251, 191, 36, 0.4)';
                e.target.style.backgroundColor = '#fbbf24';
                }}
            >
                Comenzar Ruta
            </button>
            ) : (
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                padding: '32px',
                marginTop: '20px'
            }}>
                <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid rgba(251, 191, 36, 0.3)',
                borderTop: '4px solid #fbbf24',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
                }}>
                </div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '600' }}>
                Iniciando Sistema
                </h3>
                <p style={{ margin: '0', fontSize: '16px', opacity: '0.9', lineHeight: '1.8' }}>
                Consultando sensores IoT<br />
                Procesando datos en tiempo real<br />
                Calculando ruta óptima con OR-Tools<br />
                <span style={{ color: '#fbbf24', fontWeight: '600' }}>Esto puede tomar 10-15 segundos</span>
                </p>
            </div>
            )}

            {/* Footer */}
            <p style={{
            marginTop: '40px',
            fontSize: '14px',
            opacity: '0.8',
            fontWeight: '300'
            }}>
            Powered by RabbitMQ • PostgreSQL • OR-Tools
            </p>
        </div>

        <style>{`
            @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
            }

            @keyframes spin {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(360deg);
            }
            }

            @keyframes float {
            0%, 100% {
                transform: translateY(0px);
            }
            50% {
                transform: translateY(-15px);
            }
            }

            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        `}</style>
        </div>
    );
}
