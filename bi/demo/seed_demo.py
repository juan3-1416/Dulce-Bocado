"""Semilla BI reproducible para contenedores AISLADOS bi-demo-*.

Nunca utiliza las variables BI_SALES_HOST/BI_ORDERS_HOST del ETL normal.
Las bases fuente de demostracion se crean en bi-demo-pg/bi-demo-mysql.
"""

from __future__ import annotations

import calendar
import os
import random
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

SEMILLA = 20261116
ZONA = ZoneInfo("America/La_Paz")

CATEGORIAS = (
    "Tortas", "Cupcakes", "Galletas", "Postres", "Panes", "Bebidas",
)

ARTICULOS = (
    (1, "Torta de chocolate", 95, True),
    (1, "Torta tres leches", 90, True),
    (1, "Torta de vainilla", 80, True),
    (1, "Torta de zanahoria", 88, True),
    (2, "Cupcake de vainilla", 12, True),
    (2, "Cupcake de chocolate", 13, True),
    (2, "Cupcake de frutilla", 14, True),
    (2, "Cupcake red velvet", 16, True),
    (3, "Galletas de mantequilla", 10, False),
    (3, "Galletas con chispas", 12, False),
    (3, "Galletas de avena", 9, False),
    (3, "Alfajores de maicena", 11, False),
    (4, "Cheesecake", 26, False),
    (4, "Brownie", 18, False),
    (4, "Tiramisu", 27, False),
    (4, "Flan casero", 17, False),
    (5, "Pan de queso", 8, False),
    (5, "Croissant", 12, False),
    (5, "Pan de canela", 10, False),
    (5, "Pan integral", 14, False),
    (6, "Cafe americano", 14, False),
    (6, "Capuchino", 20, False),
    (6, "Chocolate caliente", 19, False),
    (6, "Limonada", 15, False),
)


def dinero(valor):
    return Decimal(str(valor)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def catalogo_demo():
    categorias = [(n, nombre, True) for n, nombre in enumerate(CATEGORIAS, 1)]
    productos = []
    presentaciones = []
    for indice, (categoria, nombre, precio, personaliza) in enumerate(ARTICULOS, 1):
        productos.append((indice, categoria, nombre, True))
        for variante, multiplicador in ((0, Decimal("1.00")), (1, Decimal("2.60"))):
            presentacion_id = (indice - 1) * 2 + variante + 1
            titulo = f"{nombre} - {'Individual' if variante == 0 else 'Familiar'}"
            presentaciones.append((
                presentacion_id, indice, titulo,
                dinero(Decimal(precio) * multiplicador), "BOB", True,
                personaliza,
            ))
    return categorias, productos, presentaciones


def fecha_aleatoria(rng):
    # Mas movimiento a medida que avanza el ano; el rango llega a octubre.
    mes = rng.choices(range(1, 11), weights=(6, 7, 8, 9, 10, 9, 10, 11, 12, 13))[0]
    dia = rng.randint(1, calendar.monthrange(2026, mes)[1])
    return datetime(2026, mes, dia, rng.randint(8, 19), rng.randrange(0, 60, 5))


def generar_datos():
    rng = random.Random(SEMILLA)
    categorias, productos, presentaciones = catalogo_demo()
    clientes = [(n, "Cliente", f"Simulado {n:03d}", True) for n in range(1, 91)]
    usuarios = [(n, f"Operador de demo {n}", f"demo_operador_{n}", True)
                for n in range(1, 7)]
    present_por_id = {r[0]: r for r in presentaciones}
    nombre_producto = {r[0]: r[2] for r in productos}
    ventas, detalles_venta, pedidos, detalles_pedido = [], [], [], []
    detalle_venta_id = 0
    detalle_pedido_id = 0

    for id_venta in range(1, 901):
        fecha = fecha_aleatoria(rng).replace(tzinfo=ZONA)
        cliente = rng.randint(1, len(clientes)) if rng.random() < 0.82 else None
        ocasional = None if cliente else f"Cliente ocasional demo {id_venta:04d}"
        usuario = rng.randint(1, len(usuarios))
        cancelada = rng.random() < 0.085
        estado = "CANCELADA" if cancelada else "BORRADOR"
        total = dinero(0)
        cantidad_lineas = rng.choices((1, 2, 3), weights=(55, 35, 10))[0]
        for _ in range(cantidad_lineas):
            detalle_venta_id += 1
            presentacion = present_por_id[rng.randint(1, len(presentaciones))]
            cantidad = rng.randint(1, 5)
            personalizacion = (dinero(rng.choice((5, 8, 12, 15)))
                                if presentacion[6] and rng.random() < 0.26
                                else dinero(0))
            precio = presentacion[3]
            subtotal = dinero(precio * cantidad + personalizacion)
            total += subtotal
            detalles_venta.append((
                detalle_venta_id, id_venta, presentacion[0], presentacion[2],
                precio, cantidad, personalizacion, subtotal,
            ))
        ventas.append((
            id_venta, cliente, ocasional, usuario, fecha, total, "BOB", estado,
            usuario if cancelada else None,
            "Anulacion simulada de prueba" if cancelada else None,
            fecha + timedelta(minutes=30) if cancelada else None,
        ))

    for id_pedido in range(1, 451):
        fecha = fecha_aleatoria(rng)
        cliente = rng.randint(1, len(clientes)) if rng.random() < 0.86 else None
        nombre_registrado = f"Cliente Simulado {cliente:03d}" if cliente else None
        ocasional = None if cliente else f"Cliente ocasional demo pedido {id_pedido:04d}"
        usuario = rng.randint(1, len(usuarios))
        # Un porcentaje mayor de pedidos recientes sigue abierto.
        estado = rng.choices(
            ("PROGRAMADO", "EN_PROCESO", "ENTREGADO", "CANCELADO"),
            weights=(5, 10, 77, 8) if fecha.month <= 8 else (26, 28, 39, 7),
        )[0]
        fecha_prog = (fecha + timedelta(days=rng.randint(1, 8))).date()
        hora_prog = time(rng.choice((9, 10, 11, 14, 15, 16, 17)), 0)
        if estado == "ENTREGADO":
            desfase = rng.choices((-1, 0, 1, 2), weights=(8, 67, 19, 6))[0]
            entregado = datetime.combine(fecha_prog + timedelta(days=desfase), hora_prog)
            if entregado <= fecha:
                entregado = fecha + timedelta(hours=6)
        else:
            entregado = None
        cancelacion = (fecha + timedelta(hours=2) if estado == "CANCELADO" else None)
        total = dinero(0)
        cantidad_lineas = rng.choices((1, 2, 3, 4), weights=(45, 34, 16, 5))[0]
        for _ in range(cantidad_lineas):
            detalle_pedido_id += 1
            presentacion = present_por_id[rng.randint(1, len(presentaciones))]
            producto = nombre_producto[presentacion[1]]
            cantidad = rng.randint(1, 4)
            personalizacion = (dinero(rng.choice((8, 12, 18, 25)))
                                if presentacion[6] and rng.random() < 0.55
                                else dinero(0))
            precio = presentacion[3]
            subtotal = dinero(precio * cantidad + personalizacion)
            total += subtotal
            detalles_pedido.append((
                detalle_pedido_id, id_pedido, presentacion[0], producto,
                presentacion[2], precio, cantidad, personalizacion, subtotal,
            ))
        pedidos.append((
            id_pedido, cliente, nombre_registrado, ocasional, usuario, fecha,
            fecha_prog, hora_prog, total, "BOB", estado,
            usuario if estado == "ENTREGADO" else None, entregado,
            usuario if estado == "CANCELADO" else None,
            "Cancelacion simulada de prueba" if estado == "CANCELADO" else None,
            cancelacion,
        ))

    return {
        "categorias": categorias,
        "productos": productos,
        "presentaciones": presentaciones,
        "clientes": clientes,
        "usuarios": usuarios,
        "ventas": ventas,
        "detalle_venta": detalles_venta,
        "pedidos": pedidos,
        "detalle_pedido": detalles_pedido,
    }


def insertar_pg(base, consultas, datos):
    import psycopg

    with psycopg.connect(
        host=os.getenv("BI_DEMO_PG_HOST", "bi-demo-pg"), port=5432,
        dbname=base,
        user=os.environ["BI_DEMO_PG_USER"],
        password=os.environ["BI_DEMO_PG_PASSWORD"],
        connect_timeout=15,
    ) as conexion:
        with conexion.cursor() as cur:
            for tabla, consulta in consultas:
                cur.executemany(consulta, datos[tabla])
    print(f"  {base}: datos simulados insertados o ya existentes")


def insertar_mysql(datos):
    import pymysql

    conexion = pymysql.connect(
        host=os.getenv("BI_DEMO_MYSQL_HOST", "bi-demo-mysql"), port=3306,
        database="dulce_catalog", user=os.environ["BI_DEMO_MYSQL_USER"],
        password=os.environ["BI_DEMO_MYSQL_PASSWORD"],
        charset="utf8mb4", connect_timeout=15, autocommit=False,
    )
    try:
        with conexion.cursor() as cur:
            cur.executemany(
                "INSERT IGNORE INTO categorias(id_categoria,nombre,estado) VALUES (%s,%s,%s)",
                datos["categorias"],
            )
            cur.executemany(
                "INSERT IGNORE INTO productos(id_producto,id_categoria,nombre,estado) VALUES (%s,%s,%s,%s)",
                datos["productos"],
            )
            cur.executemany(
                "INSERT IGNORE INTO presentaciones(presentacion_id,id_producto,nombre,precio,moneda,disponible,permite_personalizacion) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s)",
                datos["presentaciones"],
            )
        conexion.commit()
    except Exception:
        conexion.rollback()
        raise
    finally:
        conexion.close()
    print("  dulce_catalog: datos simulados insertados o ya existentes")


def main():
    datos = generar_datos()
    print("Semilla BI simulada 2026 (solo contenedores bi-demo-*):")
    insertar_mysql(datos)
    insertar_pg("dulce_customers", [(
        "clientes",
        "INSERT INTO cliente(id_cliente,nombre,apellido,estado) VALUES (%s,%s,%s,%s) "
        "ON CONFLICT (id_cliente) DO NOTHING",
    )], datos)
    insertar_pg("dulce_security", [(
        "usuarios",
        "INSERT INTO usuarios(id_usuario,nombre,nombre_usuario,activo) VALUES (%s,%s,%s,%s) "
        "ON CONFLICT (id_usuario) DO NOTHING",
    )], datos)
    insertar_pg("dulce_sales", [
        ("ventas",
         "INSERT INTO venta(id_venta,id_cliente,nombre_cliente_ocasional,id_usuario,fecha_venta,total,moneda,estado," 
         "id_usuario_cancelacion,motivo_cancelacion,fecha_cancelacion) "
         "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id_venta) DO NOTHING"),
        ("detalle_venta",
         "INSERT INTO detalle_venta(id_detalle_venta,id_venta,presentacion_id,nombre_presentacion_snapshot," 
         "precio_unitario_snapshot,cantidad,costo_personalizacion,subtotal) "
         "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id_detalle_venta) DO NOTHING"),
    ], datos)
    insertar_pg("dulce_orders", [
        ("pedidos",
         "INSERT INTO pedido(id_pedido,id_cliente,nombre_cliente_snapshot,nombre_cliente_ocasional,id_usuario," 
         "fecha_pedido,fecha_entrega,hora_entrega,total,moneda,estado,id_usuario_entrega,fecha_entrega_efectiva," 
         "id_usuario_cancelacion,motivo_cancelacion,fecha_cancelacion) "
         "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id_pedido) DO NOTHING"),
        ("detalle_pedido",
         "INSERT INTO detalle_pedido(id_detalle_pedido,id_pedido,presentacion_id,nombre_producto_snapshot," 
         "nombre_presentacion_snapshot,precio_unitario_snapshot,cantidad,costo_personalizacion,subtotal) "
         "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id_detalle_pedido) DO NOTHING"),
    ], datos)
    print("Semilla completa (repetirla no duplica filas):")
    for tabla, filas in datos.items():
        print(f"  {tabla}: {len(filas)}")


if __name__ == "__main__":
    main()
