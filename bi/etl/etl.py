"""ETL academico Dulce Bocado: cinco OLTP -> staging -> DW PostgreSQL.

Las fuentes OLTP son de SOLO LECTURA; unicamente se escribe en dulce_dw.
No interpreta ventas en BORRADOR/CANCELADA como dinero cobrado.
"""

import json
import os
import sys
from datetime import datetime, timezone

from transformaciones import MESES_ES, clave_fecha, fecha_negocio, nombre_cliente, validar_detalle


SQL_CATALOGO = """
    SELECT pr.presentacion_id, pr.id_producto, p.id_categoria,
           c.nombre AS nombre_categoria, p.nombre AS nombre_producto,
           pr.nombre AS nombre_presentacion, pr.moneda,
           pr.disponible, pr.permite_personalizacion
      FROM presentaciones AS pr
      JOIN productos AS p ON p.id_producto = pr.id_producto
      JOIN categorias AS c ON c.id_categoria = p.id_categoria
     ORDER BY pr.presentacion_id
"""

SQL_CLIENTES = """
    SELECT id_cliente, nombre, apellido, estado
      FROM cliente
     ORDER BY id_cliente
"""

SQL_USUARIOS = """
    SELECT id_usuario, nombre, nombre_usuario, activo
      FROM usuarios
     ORDER BY id_usuario
"""

SQL_VENTAS = """
    SELECT d.id_detalle_venta AS id_detalle, d.id_venta, d.presentacion_id,
           d.nombre_presentacion_snapshot, d.precio_unitario_snapshot,
           d.cantidad, d.costo_personalizacion, d.subtotal,
           v.id_cliente, v.nombre_cliente_ocasional, v.id_usuario,
           v.fecha_venta, v.estado, v.moneda
      FROM detalle_venta AS d
      JOIN venta AS v ON v.id_venta = d.id_venta
     ORDER BY d.id_detalle_venta
"""

SQL_PEDIDOS = """
    SELECT d.id_detalle_pedido AS id_detalle, d.id_pedido, d.presentacion_id,
           d.nombre_producto_snapshot, d.nombre_presentacion_snapshot,
           d.precio_unitario_snapshot, d.cantidad,
           d.costo_personalizacion, d.subtotal,
           p.id_cliente, p.nombre_cliente_ocasional, p.id_usuario,
           p.fecha_pedido, p.fecha_entrega, p.hora_entrega,
           p.fecha_entrega_efectiva, p.estado, p.moneda
      FROM detalle_pedido AS d
      JOIN pedido AS p ON p.id_pedido = d.id_pedido
     ORDER BY d.id_detalle_pedido
"""


def configuracion(prefijo):
    """Lee credenciales locales sin imprimirlas ni ponerlas en el codigo."""
    nombres = ("HOST", "PORT", "DB", "USER", "PASSWORD")
    valores = {n: os.environ.get(f"BI_{prefijo}_{n}", "").strip() for n in nombres}
    faltan = [n for n, valor in valores.items() if not valor or valor == "REEMPLAZAR"]
    if faltan:
        raise RuntimeError(f"Configuracion BI_{prefijo} incompleta: {', '.join(faltan)}")
    return valores


def parametros_pg(config, solo_lectura=False):
    params = {
        "host": config["HOST"],
        "port": int(config["PORT"]),
        "dbname": config["DB"],
        "user": config["USER"],
        "password": config["PASSWORD"],
        "connect_timeout": 10,
    }
    if solo_lectura:
        params["options"] = "-c default_transaction_read_only=on"
    return params


def extraer_postgres(psycopg, dict_row, config, consulta):
    with psycopg.connect(**parametros_pg(config, solo_lectura=True), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(consulta)
            return cur.fetchall()


def extraer_mysql(pymysql, config, consulta):
    conn = pymysql.connect(
        host=config["HOST"], port=int(config["PORT"]),
        database=config["DB"], user=config["USER"], password=config["PASSWORD"],
        cursorclass=pymysql.cursors.DictCursor, connect_timeout=10, autocommit=False,
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as cur:
            cur.execute("START TRANSACTION READ ONLY")
            cur.execute(consulta)
            return cur.fetchall()
    finally:
        conn.rollback()
        conn.close()


def insertar_actualizar(cur, tabla, clave, datos, devolver=None):
    """UPSERT de columnas internas fijas; no se incorporan nombres del usuario."""
    nombres = list(datos)
    columnas = ", ".join(nombres)
    marcadores = ", ".join(["%s"] * len(nombres))
    actualizaciones = ", ".join(
        f"{nombre} = EXCLUDED.{nombre}" for nombre in nombres if nombre != clave
    )
    consulta = (
        f"INSERT INTO {tabla} ({columnas}) VALUES ({marcadores}) "
        f"ON CONFLICT ({clave}) DO UPDATE SET {actualizaciones}"
    )
    if devolver:
        consulta += f" RETURNING {devolver}"
    cur.execute(consulta, tuple(datos.values()))
    return cur.fetchone()[devolver] if devolver else None


def guardar_staging(cur, Jsonb, tabla, campo_clave, filas, ejecucion):
    for fila in filas:
        # El JSON es una copia de trabajo, sin contrasenas ni datos de contacto.
        payload = json.loads(json.dumps(fila, default=str, ensure_ascii=False))
        insertar_actualizar(
            cur, f"staging.{tabla}", campo_clave,
            {
                campo_clave: int(fila["id_detalle"] if campo_clave.startswith("id_detalle_") else fila[campo_clave]),
                "datos": Jsonb(payload),
                "id_ejecucion": ejecucion,
                "fecha_carga": datetime.now(timezone.utc),
            },
        )


def asegurar_fecha(cur, valor):
    fecha = fecha_negocio(valor)
    if fecha is None:
        return None
    sk = clave_fecha(fecha)
    cur.execute(
        """INSERT INTO dw.dim_tiempo
               (sk_fecha, fecha, dia, mes, trimestre, anio, nombre_mes)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (sk_fecha) DO NOTHING""",
        (sk, fecha, fecha.day, fecha.month, (fecha.month - 1) // 3 + 1,
         fecha.year, MESES_ES[fecha.month - 1]),
    )
    return sk


def cargar_dimensiones(cur, fuentes):
    productos = {}
    clientes = {}
    usuarios = {}

    for fila in fuentes["catalogo"]:
        origen = int(fila["presentacion_id"])
        productos[origen] = insertar_actualizar(
            cur, "dw.dim_producto", "presentacion_id_origen", {
                "presentacion_id_origen": origen,
                "id_producto_origen": fila["id_producto"],
                "id_categoria_origen": fila["id_categoria"],
                "nombre_categoria": fila["nombre_categoria"],
                "nombre_producto": fila["nombre_producto"],
                "nombre_presentacion": fila["nombre_presentacion"],
                "moneda": fila["moneda"],
                "disponible": bool(fila["disponible"]),
                "permite_personalizacion": bool(fila["permite_personalizacion"]),
                "fecha_actualizacion_dw": datetime.now(timezone.utc),
            }, devolver="sk_producto",
        )

    for fila in fuentes["clientes"]:
        origen = int(fila["id_cliente"])
        clientes[origen] = insertar_actualizar(
            cur, "dw.dim_cliente", "id_cliente_origen", {
                "id_cliente_origen": origen,
                "nombre_cliente": nombre_cliente(fila),
                "es_ocasional": False,
                "estado": bool(fila["estado"]) if fila["estado"] is not None else None,
                "fecha_actualizacion_dw": datetime.now(timezone.utc),
            }, devolver="sk_cliente",
        )

    for fila in fuentes["usuarios"]:
        origen = int(fila["id_usuario"])
        usuarios[origen] = insertar_actualizar(
            cur, "dw.dim_usuario", "id_usuario_origen", {
                "id_usuario_origen": origen,
                "nombre_usuario": fila["nombre"],
                "login_usuario": fila["nombre_usuario"],
                "activo": bool(fila["activo"]) if fila["activo"] is not None else None,
                "fecha_actualizacion_dw": datetime.now(timezone.utc),
            }, devolver="sk_usuario",
        )
    return productos, clientes, usuarios


def clave_relacion(diccionario, origen, estadisticas, nombre):
    if origen is None:
        return 0
    clave = diccionario.get(int(origen))
    if clave is None:
        estadisticas[nombre] = estadisticas.get(nombre, 0) + 1
        return 0
    return clave


def cargar_hechos(cur, fuentes, dimensiones):
    productos, clientes, usuarios = dimensiones
    ausentes = {}

    for fila in fuentes["ventas"]:
        validar_detalle(fila, "venta")
        fecha = asegurar_fecha(cur, fila["fecha_venta"])
        if fecha is None:
            raise ValueError(f"Venta sin fecha (detalle {fila['id_detalle']})")
        insertar_actualizar(cur, "dw.fact_ventas", "id_detalle_venta_origen", {
            "id_detalle_venta_origen": fila["id_detalle"],
            "id_venta_origen": fila["id_venta"],
            "sk_fecha_venta": fecha,
            "sk_producto": clave_relacion(productos, fila["presentacion_id"], ausentes, "productos"),
            "sk_cliente": clave_relacion(clientes, fila["id_cliente"], ausentes, "clientes"),
            "sk_usuario": clave_relacion(usuarios, fila["id_usuario"], ausentes, "usuarios"),
            "fecha_venta_origen": fila["fecha_venta"],
            "nombre_presentacion_snapshot": fila["nombre_presentacion_snapshot"],
            "nombre_cliente_ocasional": fila["nombre_cliente_ocasional"],
            "estado_venta": fila["estado"],
            "moneda": fila["moneda"],
            "cantidad": fila["cantidad"],
            "precio_unitario_snapshot": fila["precio_unitario_snapshot"],
            "costo_personalizacion": fila["costo_personalizacion"],
            "subtotal": fila["subtotal"],
        })

    for fila in fuentes["pedidos"]:
        validar_detalle(fila, "pedido")
        fecha_pedido = asegurar_fecha(cur, fila["fecha_pedido"])
        fecha_programada = asegurar_fecha(cur, fila["fecha_entrega"])
        if fecha_pedido is None or fecha_programada is None:
            raise ValueError(f"Pedido sin fecha obligatoria (detalle {fila['id_detalle']})")
        fecha_real = asegurar_fecha(cur, fila["fecha_entrega_efectiva"])
        insertar_actualizar(cur, "dw.fact_pedidos", "id_detalle_pedido_origen", {
            "id_detalle_pedido_origen": fila["id_detalle"],
            "id_pedido_origen": fila["id_pedido"],
            "sk_fecha_pedido": fecha_pedido,
            "sk_fecha_programada": fecha_programada,
            "sk_fecha_entrega_real": fecha_real,
            "sk_producto": clave_relacion(productos, fila["presentacion_id"], ausentes, "productos"),
            "sk_cliente": clave_relacion(clientes, fila["id_cliente"], ausentes, "clientes"),
            "sk_usuario": clave_relacion(usuarios, fila["id_usuario"], ausentes, "usuarios"),
            "fecha_pedido_origen": fila["fecha_pedido"],
            "hora_entrega_programada": fila["hora_entrega"],
            "fecha_entrega_efectiva": fila["fecha_entrega_efectiva"],
            "nombre_producto_snapshot": fila["nombre_producto_snapshot"],
            "nombre_presentacion_snapshot": fila["nombre_presentacion_snapshot"],
            "nombre_cliente_ocasional": fila["nombre_cliente_ocasional"],
            "estado_pedido": fila["estado"],
            "moneda": fila["moneda"],
            "cantidad": fila["cantidad"],
            "precio_unitario_snapshot": fila["precio_unitario_snapshot"],
            "costo_personalizacion": fila["costo_personalizacion"],
            "subtotal": fila["subtotal"],
        })
    return ausentes


def cargar_en_dw(psycopg, dict_row, Jsonb, config, fuentes):
    total_leido = sum(len(filas) for filas in fuentes.values())
    total_hechos = len(fuentes["ventas"]) + len(fuentes["pedidos"])

    with psycopg.connect(**parametros_pg(config), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('staging.catalogo') AS tabla")
            if cur.fetchone()["tabla"] is None:
                raise RuntimeError("Faltan tablas de staging: ejecuta bi/sql/003_staging.sql primero")

            cur.execute(
                """INSERT INTO dw.etl_ejecucion(proceso, estado)
                   VALUES ('BI_VENTAS_PEDIDOS', 'INICIADO') RETURNING id_ejecucion"""
            )
            ejecucion = cur.fetchone()["id_ejecucion"]

            for tabla, campo in (
                ("catalogo", "presentacion_id"),
                ("clientes", "id_cliente"),
                ("usuarios", "id_usuario"),
                ("ventas", "id_detalle_venta"),
                ("pedidos", "id_detalle_pedido"),
            ):
                guardar_staging(cur, Jsonb, tabla, campo, fuentes[tabla], ejecucion)

            dimensiones = cargar_dimensiones(cur, fuentes)
            ausentes = cargar_hechos(cur, fuentes, dimensiones)

            cur.execute(
                """UPDATE dw.etl_ejecucion
                      SET estado = 'EXITO', fin = NOW(),
                          filas_leidas = %s, filas_cargadas = %s,
                          detalle = %s
                    WHERE id_ejecucion = %s""",
                (total_leido, total_hechos,
                 f"Referencias externas no encontradas: {ausentes}", ejecucion),
            )

    return ejecucion, total_leido, total_hechos, ausentes


def registrar_fallo(psycopg, config, exc):
    try:
        with psycopg.connect(**parametros_pg(config)) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO dw.etl_ejecucion
                       (proceso, estado, fin, detalle)
                       VALUES ('BI_VENTAS_PEDIDOS', 'FALLIDO', NOW(), %s)""",
                    (f"{type(exc).__name__}: la ejecucion se revirtio; revisar logs",),
                )
    except Exception:
        print("Aviso: no se pudo registrar el fallo en dulce_dw", file=sys.stderr)


def main():
    try:
        import psycopg
        import pymysql
        from psycopg.rows import dict_row
        from psycopg.types.json import Jsonb
    except ImportError as exc:
        raise RuntimeError("Instala las dependencias de requirements.txt") from exc

    configs = {
        nombre: configuracion(nombre)
        for nombre in ("CATALOG", "CUSTOMERS", "SECURITY", "SALES", "ORDERS", "DW")
    }

    print("ETL Dulce Bocado: iniciando lecturas OLTP (solo lectura)")
    try:
        fuentes = {
            "catalogo": extraer_mysql(pymysql, configs["CATALOG"], SQL_CATALOGO),
            "clientes": extraer_postgres(psycopg, dict_row, configs["CUSTOMERS"], SQL_CLIENTES),
            "usuarios": extraer_postgres(psycopg, dict_row, configs["SECURITY"], SQL_USUARIOS),
            "ventas": extraer_postgres(psycopg, dict_row, configs["SALES"], SQL_VENTAS),
            "pedidos": extraer_postgres(psycopg, dict_row, configs["ORDERS"], SQL_PEDIDOS),
        }
        for nombre, filas in fuentes.items():
            print(f"  {nombre}: {len(filas)} filas extraidas")

        ejecucion, leidas, hechos, ausentes = cargar_en_dw(
            psycopg, dict_row, Jsonb, configs["DW"], fuentes
        )
        print(f"ETL EXITOSO (ejecucion {ejecucion}): {leidas} filas leidas; {hechos} detalles procesados")
        if ausentes:
            print(f"AVISO: referencias externas que utilizaron el miembro desconocido: {ausentes}")
        if not hechos:
            print("AVISO: no hay detalles OLTP; se prepararan datos simulados en el siguiente paso")
    except Exception as exc:
        print(f"ETL FALLIDO: {type(exc).__name__}: {exc}", file=sys.stderr)
        registrar_fallo(psycopg, configs["DW"], exc)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
