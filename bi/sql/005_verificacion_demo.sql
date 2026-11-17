-- Ejecutar UNICAMENTE contra el DW de laboratorio: bi-demo-dw (puerto 5435).
SELECT tabla, filas FROM (
    SELECT 'dw.dim_tiempo' AS tabla, count(*) AS filas FROM dw.dim_tiempo
    UNION ALL SELECT 'dw.dim_producto', count(*) FROM dw.dim_producto
    UNION ALL SELECT 'dw.dim_cliente', count(*) FROM dw.dim_cliente
    UNION ALL SELECT 'dw.dim_usuario', count(*) FROM dw.dim_usuario
    UNION ALL SELECT 'dw.fact_ventas', count(*) FROM dw.fact_ventas
    UNION ALL SELECT 'dw.fact_pedidos', count(*) FROM dw.fact_pedidos
    UNION ALL SELECT 'staging.catalogo', count(*) FROM staging.catalogo
    UNION ALL SELECT 'staging.clientes', count(*) FROM staging.clientes
    UNION ALL SELECT 'staging.usuarios', count(*) FROM staging.usuarios
    UNION ALL SELECT 'staging.ventas', count(*) FROM staging.ventas
    UNION ALL SELECT 'staging.pedidos', count(*) FROM staging.pedidos
) x ORDER BY tabla;

SELECT id_ejecucion, estado, filas_leidas, filas_cargadas, detalle
  FROM dw.etl_ejecucion ORDER BY id_ejecucion DESC LIMIT 5;

SELECT 'ventas' AS tipo, count(*) AS lineas,
       count(DISTINCT id_detalle_venta_origen) AS ids_unicos,
       count(DISTINCT id_venta_origen) AS operaciones,
       min(fecha_venta_origen::DATE) AS fecha_minima,
       max(fecha_venta_origen::DATE) AS fecha_maxima
  FROM dw.fact_ventas
UNION ALL
SELECT 'pedidos', count(*), count(DISTINCT id_detalle_pedido_origen),
       count(DISTINCT id_pedido_origen),
       min(fecha_pedido_origen::DATE), max(fecha_pedido_origen::DATE)
  FROM dw.fact_pedidos;

SELECT 'ventas' AS proceso, estado_venta AS estado, count(DISTINCT id_venta_origen) AS operaciones
  FROM dw.fact_ventas GROUP BY estado_venta
UNION ALL
SELECT 'pedidos', estado_pedido, count(DISTINCT id_pedido_origen)
  FROM dw.fact_pedidos GROUP BY estado_pedido
ORDER BY proceso, estado;

SELECT 'ventas_sin_producto' AS indicador, count(*) AS casos
  FROM dw.fact_ventas WHERE sk_producto = 0
UNION ALL SELECT 'pedidos_sin_producto', count(*) FROM dw.fact_pedidos WHERE sk_producto = 0
UNION ALL SELECT 'ventas_sin_usuario', count(*) FROM dw.fact_ventas WHERE sk_usuario = 0
UNION ALL SELECT 'pedidos_sin_usuario', count(*) FROM dw.fact_pedidos WHERE sk_usuario = 0;
