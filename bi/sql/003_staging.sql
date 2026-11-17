-- Paso 3: zonas de preparacion de datos para el ETL.
-- Ejecutar SOLO en la base nueva dulce_dw, despues de 001_init_dw.sql.
CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE IF NOT EXISTS staging.catalogo (
    presentacion_id BIGINT PRIMARY KEY,
    datos JSONB NOT NULL,
    id_ejecucion BIGINT NOT NULL REFERENCES dw.etl_ejecucion(id_ejecucion),
    fecha_carga TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staging.clientes (
    id_cliente BIGINT PRIMARY KEY,
    datos JSONB NOT NULL,
    id_ejecucion BIGINT NOT NULL REFERENCES dw.etl_ejecucion(id_ejecucion),
    fecha_carga TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staging.usuarios (
    id_usuario BIGINT PRIMARY KEY,
    datos JSONB NOT NULL,
    id_ejecucion BIGINT NOT NULL REFERENCES dw.etl_ejecucion(id_ejecucion),
    fecha_carga TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staging.ventas (
    id_detalle_venta BIGINT PRIMARY KEY,
    datos JSONB NOT NULL,
    id_ejecucion BIGINT NOT NULL REFERENCES dw.etl_ejecucion(id_ejecucion),
    fecha_carga TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staging.pedidos (
    id_detalle_pedido BIGINT PRIMARY KEY,
    datos JSONB NOT NULL,
    id_ejecucion BIGINT NOT NULL REFERENCES dw.etl_ejecucion(id_ejecucion),
    fecha_carga TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
