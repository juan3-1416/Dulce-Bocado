-- Consultas de solo lectura para comprobar la creacion inicial.
SELECT 'dim_tiempo' AS objeto, COUNT(*) AS filas FROM dw.dim_tiempo
UNION ALL SELECT 'dim_producto', COUNT(*) FROM dw.dim_producto
UNION ALL SELECT 'dim_cliente', COUNT(*) FROM dw.dim_cliente
UNION ALL SELECT 'dim_usuario', COUNT(*) FROM dw.dim_usuario
UNION ALL SELECT 'fact_ventas', COUNT(*) FROM dw.fact_ventas
UNION ALL SELECT 'fact_pedidos', COUNT(*) FROM dw.fact_pedidos
ORDER BY objeto;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'dw'
ORDER BY table_name;
