import unittest

from etl import guardar_staging, insertar_actualizar


class CursorFalso:
    def __init__(self):
        self.consulta = ""
        self.parametros = ()

    def execute(self, consulta, parametros):
        self.consulta = consulta
        self.parametros = parametros

    def fetchone(self):
        return {"sk_producto": 7}


class TestEstructuraETL(unittest.TestCase):
    def test_upsert_por_clave_origen(self):
        cur = CursorFalso()
        sk = insertar_actualizar(
            cur, "dw.dim_producto", "presentacion_id_origen",
            {"presentacion_id_origen": 10, "nombre_producto": "Torta"},
            devolver="sk_producto",
        )
        self.assertEqual(sk, 7)
        self.assertIn("ON CONFLICT (presentacion_id_origen) DO UPDATE", cur.consulta)
        self.assertEqual(cur.parametros, (10, "Torta"))

    def test_staging_usa_id_detalle_de_la_fuente(self):
        cur = CursorFalso()
        fila = {"id_detalle": 31, "id_venta": 4}
        guardar_staging(cur, lambda payload: payload, "ventas", "id_detalle_venta", [fila], 9)
        self.assertIn("staging.ventas", cur.consulta)
        self.assertEqual(cur.parametros[0], 31)
        self.assertEqual(cur.parametros[1]["id_venta"], 4)
        self.assertEqual(cur.parametros[2], 9)


if __name__ == "__main__":
    unittest.main()
