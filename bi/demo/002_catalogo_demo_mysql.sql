-- Proyeccion academica de las tablas de catalog-service usadas por el ETL.
-- Se ejecuta unicamente dentro del MySQL aislado bi-demo-mysql.
CREATE TABLE categorias (
    id_categoria BIGINT UNSIGNED PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    estado BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE productos (
    id_producto BIGINT UNSIGNED PRIMARY KEY,
    id_categoria BIGINT UNSIGNED NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_producto_cat (id_categoria, nombre),
    CONSTRAINT fk_demo_producto_categoria FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE presentaciones (
    presentacion_id BIGINT UNSIGNED PRIMARY KEY,
    id_producto BIGINT UNSIGNED NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    precio DECIMAL(12,2) NOT NULL,
    moneda CHAR(3) NOT NULL DEFAULT 'BOB',
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    permite_personalizacion BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uq_presentacion_producto (id_producto, nombre),
    CONSTRAINT fk_demo_presentacion_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
