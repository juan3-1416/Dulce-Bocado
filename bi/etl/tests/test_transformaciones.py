import unittest
from datetime import date, datetime, timezone

from transformaciones import clave_fecha, fecha_negocio, nombre_cliente, validar_detalle


class TestTransformaciones(unittest.TestCase):
    def test_clave_de_fecha(self):
        self.assertEqual(clave_fecha(date(2026, 11, 16)), 20261116)

    def test_venta_utc_se_convierte_a_bolivia(self):
        dt = datetime(2026, 11, 17, 2, 30, tzinfo=timezone.utc)
        self.assertEqual(fecha_negocio(dt), date(2026, 11, 16))

    def test_cliente_sin_apellido(self):
        self.assertEqual(nombre_cliente({"id_cliente": 12, "nombre": "Ana", "apellido": None}), "Ana")

    def test_detalle_correcto(self):
        fila = {"id_detalle": 10, "cantidad": 2, "precio_unitario_snapshot": "25.00", "costo_personalizacion": "5.00", "subtotal": "55.00"}
        self.assertEqual(validar_detalle(fila, "venta"), 2)

    def test_detalle_rechaza_cantidad_cero(self):
        fila = {"id_detalle": 11, "cantidad": 0, "precio_unitario_snapshot": "25.00", "costo_personalizacion": "0", "subtotal": "0"}
        with self.assertRaises(ValueError):
            validar_detalle(fila, "pedido")


if __name__ == "__main__":
    unittest.main()
