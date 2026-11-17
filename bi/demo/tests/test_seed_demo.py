"""Pruebas puras, sin Docker ni credenciales."""

import importlib.util
from collections import defaultdict
from pathlib import Path


spec = importlib.util.spec_from_file_location("demo_seed", Path(__file__).parents[1] / "seed_demo.py")
modulo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(modulo)
datos = modulo.generar_datos()


def test_cantidades_y_reproducibilidad():
    assert datos == modulo.generar_datos()
    assert {k: len(v) for k, v in datos.items()} == {
        "categorias": 6,
        "productos": 24,
        "presentaciones": 48,
        "clientes": 90,
        "usuarios": 6,
        "ventas": 900,
        "detalle_venta": 1374,
        "pedidos": 450,
        "detalle_pedido": 826,
    }


def test_ids_y_referencias_coherentes():
    for tabla in datos.values():
        assert len({fila[0] for fila in tabla}) == len(tabla)
    pres_ids = {fila[0] for fila in datos["presentaciones"]}
    client_ids = {fila[0] for fila in datos["clientes"]}
    user_ids = {fila[0] for fila in datos["usuarios"]}
    sale_ids = {fila[0] for fila in datos["ventas"]}
    order_ids = {fila[0] for fila in datos["pedidos"]}
    assert all(fila[1] in sale_ids and fila[2] in pres_ids for fila in datos["detalle_venta"])
    assert all(fila[1] in order_ids and fila[2] in pres_ids for fila in datos["detalle_pedido"])
    assert all((fila[1] is None or fila[1] in client_ids) and fila[3] in user_ids
               for fila in datos["ventas"])
    assert all((fila[1] is None or fila[1] in client_ids) and fila[4] in user_ids
               for fila in datos["pedidos"])


def test_sumas_coinciden_con_snapshots():
    subtotales_venta = defaultdict(lambda: modulo.dinero(0))
    for fila in datos["detalle_venta"]:
        assert fila[7] == modulo.dinero(fila[4] * fila[5] + fila[6])
        subtotales_venta[fila[1]] += fila[7]
    assert all(venta[5] == subtotales_venta[venta[0]] for venta in datos["ventas"])

    subtotales_pedido = defaultdict(lambda: modulo.dinero(0))
    for fila in datos["detalle_pedido"]:
        assert fila[8] == modulo.dinero(fila[5] * fila[6] + fila[7])
        subtotales_pedido[fila[1]] += fila[8]
    assert all(pedido[8] == subtotales_pedido[pedido[0]] for pedido in datos["pedidos"])


def test_auditoria_y_periodo():
    for venta in datos["ventas"]:
        assert venta[4].year == 2026 and 1 <= venta[4].month <= 10
        assert (venta[1] is None) != (venta[2] is None)
        assert (venta[8] is not None) == (venta[7] == "CANCELADA")
        assert (venta[9] is not None) == (venta[7] == "CANCELADA")
        assert (venta[10] is not None) == (venta[7] == "CANCELADA")
    for pedido in datos["pedidos"]:
        assert pedido[5].year == 2026 and 1 <= pedido[5].month <= 10
        assert (pedido[1] is None) != (pedido[3] is None)
        assert (pedido[11] is not None) == (pedido[10] == "ENTREGADO")
        assert (pedido[12] is not None) == (pedido[10] == "ENTREGADO")
        assert (pedido[13] is not None) == (pedido[10] == "CANCELADO")
        assert (pedido[14] is not None) == (pedido[10] == "CANCELADO")
        assert (pedido[15] is not None) == (pedido[10] == "CANCELADO")
