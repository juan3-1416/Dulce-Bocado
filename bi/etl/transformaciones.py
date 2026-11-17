"""Funciones puras para integrar fechas y valores en Dulce Bocado BI."""

from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo


MESES_ES = (
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
)

ZONA_NEGOCIO = ZoneInfo("America/La_Paz")


def fecha_negocio(valor):
    """Fecha en Bolivia; normaliza TIMESTAMPTZ de ventas antes de agrupar."""
    if valor is None:
        return None
    if isinstance(valor, datetime):
        return (valor.astimezone(ZONA_NEGOCIO) if valor.tzinfo else valor).date()
    if isinstance(valor, date):
        return valor
    if isinstance(valor, str):
        return fecha_negocio(datetime.fromisoformat(valor))
    raise TypeError(f"Tipo de fecha no soportado: {type(valor).__name__}")


def clave_fecha(valor):
    fecha = fecha_negocio(valor)
    return int(fecha.strftime("%Y%m%d")) if fecha is not None else None


def nombre_cliente(fila):
    nombre = " ".join(
        parte.strip() for parte in (fila.get("nombre"), fila.get("apellido"))
        if parte and str(parte).strip()
    )
    return nombre or f"Cliente {fila['id_cliente']}"


def validar_detalle(fila, tipo):
    """Validar las medidas sin recalcular subtotales historicos."""
    cantidad = int(fila["cantidad"])
    if cantidad <= 0:
        raise ValueError(f"{tipo}: cantidad no positiva (detalle {fila['id_detalle']})")
    for campo in ("precio_unitario_snapshot", "costo_personalizacion", "subtotal"):
        numero = Decimal(str(fila[campo]))
        if not numero.is_finite() or numero < 0:
            raise ValueError(f"{tipo}: {campo} invalido (detalle {fila['id_detalle']})")
    return cantidad
