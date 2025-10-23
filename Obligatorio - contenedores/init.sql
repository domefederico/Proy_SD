-- Script de inicialización de la base de datos
CREATE TABLE IF NOT EXISTS contenedores (
    id SERIAL PRIMARY KEY,
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    porcentaje INTEGER NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 100)
);

-- Insertar datos de ejemplo (contenedores en Montevideo, Uruguay)
INSERT INTO contenedores (latitud, longitud, porcentaje) VALUES
    (-34.9011, -56.1645, 85),  -- Contenedor lleno
    (-34.8941, -56.1650, 90),  -- Contenedor lleno
    (-34.9055, -56.1678, 45),  -- Contenedor medio
    (-34.9033, -56.1622, 78),  -- Contenedor lleno
    (-34.8988, -56.1701, 92),  -- Contenedor lleno
    (-34.9077, -56.1589, 30),  -- Contenedor bajo
    (-34.8965, -56.1633, 88),  -- Contenedor lleno
    (-34.9099, -56.1711, 95),  -- Contenedor lleno
    (-34.8922, -56.1688, 25),  -- Contenedor bajo
    (-34.9044, -56.1599, 82);  -- Contenedor lleno

-- Verificar datos insertados
SELECT COUNT(*) as total_contenedores FROM contenedores;
SELECT COUNT(*) as contenedores_llenos FROM contenedores WHERE porcentaje >= 75;
