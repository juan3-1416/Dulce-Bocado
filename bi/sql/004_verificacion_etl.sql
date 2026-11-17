-- Comprobaciones de solo lectura tras ejecutar el ETL.
SELECT 'dim_producto' AS tabla, COUNT(*) AS filas FROM dw.dim_producto
UNION ALL SELECT 'dim_cliente', COUNT(*) FROM dw.dim_cliente
UNION ALL SELECT 'dim_usuario', COUNT(*) FROM dw.dim_usuario
UNION ALL SELECT 'fact_ventas', COUNT(*) FROM dw.fact_ventas
UNION ALL SELECT 'fact_pedidos', COUNT(*) FROM dw.fact_pedidos
UNION ALL SELECT 'staging.catalogo', COUNT(*) FROM staging.catalogo
UNION ALL SELECT 'staging.clientes', COUNT(*) FROM staging.clientes
UNION ALL SELECT 'staging.usuarios', COUNT(*) FROM staging.usuarios
UNION ALL SELECT 'staging.ventas', COUNT(*) FROM staging.ventas
UNION ALL SELECT 'staging.pedidos', COUNT(*) FROM staging.pedidos
ORDER BY tabla;

SELECT id_ejecucion, proceso, estado, inicio, fin, filas_leidas, filas_cargadas, detalle
FROM dw.etl_ejecucion
ORDER BY id_ejecucion DESC
LIMIT 5;

-- Unicos por detalle; cantidad de hechos no debe aumentar al reejecutar
-- si las bases OLTP no cambiaron entre corridas.
SELECT COUNT(*) AS detalles_venta, COUNT(DISTINCT id_detalle_venta_origen) AS distintos
FROM dw.fact_ventas;
SELECT COUNT(*) AS detalles_pedido, COUNT(DISTINCT id_detalle_pedido_origen) AS distintos
FROM dw.fact_pedidos;
