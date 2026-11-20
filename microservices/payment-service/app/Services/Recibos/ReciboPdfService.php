<?php

namespace App\Services\Recibos;

use App\Models\Recibo;

class ReciboPdfService
{
    /**
     * Genera un documento PDF 1.4 nativo en memoria con formato A4.
     * No requiere dependencias externas ni binarios del sistema.
     */
    public function generar(Recibo $recibo): string
    {
        $snapshot = is_array($recibo->snapshot)
            ? $recibo->snapshot
            : [];

        $numero = (string) ($recibo->numero ?: sprintf('REC-%06d', $recibo->id_recibo));
        $estado = strtoupper((string) $recibo->estado);
        $esAnulado = ($estado === 'ANULADO');

        $origenTipo = strtoupper((string) ($snapshot['origen_tipo'] ?? $recibo->pago?->origen_tipo ?? 'VENTA'));
        $origenId = (int) ($snapshot['origen_id'] ?? $recibo->pago?->origen_id ?? 0);
        $monto = bcadd((string) ($snapshot['monto'] ?? $recibo->pago?->monto ?? '0.00'), '0', 2);
        $moneda = (string) ($snapshot['moneda'] ?? 'BOB');
        $medio = strtoupper((string) ($snapshot['medio'] ?? $recibo->pago?->medio ?? 'EFECTIVO'));
        $fechaEmision = $recibo->emitido_at
            ? $recibo->emitido_at->format('d/m/Y H:i:s')
            : date('d/m/Y H:i:s');
        $fechaPago = !empty($snapshot['fecha_pago'])
            ? date('d/m/Y H:i:s', strtotime($snapshot['fecha_pago']))
            : $fechaEmision;
        $operacionId = (string) ($snapshot['operacion_id'] ?? $recibo->pago?->operacion_id ?? 'N/D');

        $cliente = $snapshot['cliente'] ?? [];
        $nombreCliente = (string) ($cliente['nombre'] ?? $recibo->nombre_cliente ?? 'Cliente ocasional');
        $ciNitCliente = (string) ($cliente['ci_nit'] ?? $recibo->ci_nit_cliente ?? 'No registrado');

        $totalOrigen = bcadd((string) ($snapshot['total_origen'] ?? $recibo->pago?->total_origen_snapshot ?? $monto), '0', 2);
        $totalPagado = bcadd((string) ($snapshot['total_pagado_acumulado'] ?? $monto), '0', 2);
        $saldoRestante = bcsub($totalOrigen, $totalPagado, 2);
        if (bccomp($saldoRestante, '0.00', 2) < 0) {
            $saldoRestante = '0.00';
        }

        $detalles = is_array($snapshot['detalles'] ?? null)
            ? $snapshot['detalles']
            : [];

        $instrucciones = [];

        // Fondo de página blanco
        $instrucciones[] = '1.0 1.0 1.0 rg 0 0 595.28 841.89 re f';

        // Marco exterior
        $instrucciones[] = '0.85 0.85 0.85 RG 1.0 w 30 30 535.28 781.89 re S';

        // Franja decorativa superior (Color ámbar cálido característico de pastelería)
        $instrucciones[] = '0.96 0.65 0.20 rg 30 792 535.28 20 re f';

        // Encabezado principal
        $instrucciones[] = '0.22 0.15 0.10 rg';
        $instrucciones[] = $this->texto(50, 755, 'F2', 20, 'DULCE BOCADO');
        $instrucciones[] = '0.45 0.45 0.45 rg';
        $instrucciones[] = $this->texto(50, 740, 'F1', 9, 'Pasteleria y Confiteria Artesanal');
        $instrucciones[] = '0.20 0.20 0.20 rg';
        $instrucciones[] = $this->texto(50, 715, 'F2', 13, 'RECIBO INTERNO DE PAGO');
        $instrucciones[] = '0.60 0.15 0.15 rg';
        $instrucciones[] = $this->texto(50, 700, 'F1', 8, 'DOCUMENTO DE CONTROL INTERNO - NO VALIDO PARA CREDITO FISCAL');

        // Cuadro de Recibo (Esquina Superior Derecha)
        $instrucciones[] = '0.94 0.94 0.96 rg 350 695 200 80 re f';
        $instrucciones[] = '0.80 0.80 0.85 RG 1.0 w 350 695 200 80 re S';

        $instrucciones[] = '0.30 0.30 0.30 rg';
        $instrucciones[] = $this->texto(365, 758, 'F2', 9, 'NUMERO DE RECIBO:');
        $instrucciones[] = '0.15 0.35 0.65 rg';
        $instrucciones[] = $this->texto(365, 740, 'F2', 14, $numero);

        $instrucciones[] = '0.30 0.30 0.30 rg';
        $instrucciones[] = $this->texto(365, 722, 'F1', 8, 'ESTADO:');

        if ($esAnulado) {
            $instrucciones[] = '0.85 0.15 0.15 rg';
            $instrucciones[] = $this->texto(410, 722, 'F2', 9, 'ANULADO');
        } else {
            $instrucciones[] = '0.12 0.55 0.20 rg';
            $instrucciones[] = $this->texto(410, 722, 'F2', 9, 'EMITIDO (CONFIRMADO)');
        }

        $instrucciones[] = '0.40 0.40 0.40 rg';
        $instrucciones[] = $this->texto(365, 705, 'F1', 8, 'Emision: ' . $fechaEmision);

        // Línea divisoria
        $instrucciones[] = '0.82 0.82 0.82 RG 0.75 w 50 680 495.28 0 re S';

        // Sección de Datos de la Operación y Cliente
        $instrucciones[] = '0.98 0.98 0.98 rg 50 595 495.28 75 re f';
        $instrucciones[] = '0.88 0.88 0.88 RG 0.5 w 50 595 495.28 75 re S';

        // Columna Izquierda: Cliente
        $instrucciones[] = '0.20 0.20 0.20 rg';
        $instrucciones[] = $this->texto(60, 655, 'F2', 9, 'Cliente:');
        $instrucciones[] = '0.10 0.10 0.10 rg';
        $instrucciones[] = $this->texto(110, 655, 'F1', 9, $this->truncar($nombreCliente, 36));

        $instrucciones[] = '0.20 0.20 0.20 rg';
        $instrucciones[] = $this->texto(60, 638, 'F2', 9, 'CI / NIT:');
        $instrucciones[] = '0.10 0.10 0.10 rg';
        $instrucciones[] = $this->texto(110, 638, 'F1', 9, $ciNitCliente);

        $instrucciones[] = '0.20 0.20 0.20 rg';
        $instrucciones[] = $this->texto(60, 621, 'F2', 9, 'Operacion:');
        $instrucciones[] = '0.10 0.10 0.10 rg';
        $instrucciones[] = $this->texto(125, 621, 'F1', 9, $origenTipo . ' #' . $origenId);

        // Columna Derecha: Pago
        $instrucciones[] = '0.20 0.20 0.20 rg';
        $instrucciones[] = $this->texto(320, 655, 'F2', 9, 'Medio de Pago:');
        $instrucciones[] = '0.10 0.10 0.10 rg';
        $instrucciones[] = $this->texto(400, 655, 'F1', 9, $medio);

        $instrucciones[] = '0.20 0.20 0.20 rg';
        $instrucciones[] = $this->texto(320, 638, 'F2', 9, 'Fecha de Pago:');
        $instrucciones[] = '0.10 0.10 0.10 rg';
        $instrucciones[] = $this->texto(400, 638, 'F1', 9, $fechaPago);

        $instrucciones[] = '0.20 0.20 0.20 rg';
        $instrucciones[] = $this->texto(320, 621, 'F2', 9, 'Operacion ID:');
        $instrucciones[] = '0.30 0.30 0.30 rg';
        $instrucciones[] = $this->texto(400, 621, 'F1', 8, $this->truncar($operacionId, 22));

        // Tabla de Concepto / Líneas
        $yTabla = 560;
        $instrucciones[] = '0.90 0.91 0.94 rg 50 ' . ($yTabla - 15) . ' 495.28 18 re f';
        $instrucciones[] = '0.80 0.80 0.80 RG 0.5 w 50 ' . ($yTabla - 15) . ' 495.28 18 re S';

        $instrucciones[] = '0.15 0.15 0.15 rg';
        $instrucciones[] = $this->texto(60, $yTabla - 3, 'F2', 9, 'CANT.');
        $instrucciones[] = $this->texto(110, $yTabla - 3, 'F2', 9, 'DESCRIPCION / CONCEPTO');
        $instrucciones[] = $this->textoDerecha(440, $yTabla - 3, 'F2', 9, 'P. UNIT.');
        $instrucciones[] = $this->textoDerecha(535, $yTabla - 3, 'F2', 9, 'SUBTOTAL');

        $yFila = $yTabla - 32;
        $limiteFilas = 10;
        $filasMostradas = 0;

        if (empty($detalles)) {
            // Fila resumen genérica
            $instrucciones[] = '0.20 0.20 0.20 rg';
            $instrucciones[] = $this->texto(60, $yFila, 'F1', 9, '1');
            $instrucciones[] = $this->texto(110, $yFila, 'F1', 9, 'Pago correspondiente a ' . $origenTipo . ' #' . $origenId);
            $instrucciones[] = $this->textoDerecha(440, $yFila, 'F1', 9, 'Bs ' . $monto);
            $instrucciones[] = $this->textoDerecha(535, $yFila, 'F1', 9, 'Bs ' . $monto);
            $yFila -= 20;
        } else {
            foreach ($detalles as $det) {
                if ($filasMostradas >= $limiteFilas) {
                    $instrucciones[] = '0.40 0.40 0.40 rg';
                    $instrucciones[] = $this->texto(110, $yFila, 'F1', 8, '... y ' . (count($detalles) - $limiteFilas) . ' items adicionales');
                    $yFila -= 16;
                    break;
                }

                $cant = (string) ($det['cantidad'] ?? '1');
                $desc = $this->truncar((string) ($det['descripcion'] ?? 'Item'), 42);
                $pUnit = (string) ($det['precio_unitario'] ?? '0.00');
                $subt = (string) ($det['subtotal'] ?? '0.00');

                $instrucciones[] = '0.25 0.25 0.25 rg';
                $instrucciones[] = $this->texto(60, $yFila, 'F1', 9, $cant);
                $instrucciones[] = $this->texto(110, $yFila, 'F1', 9, $desc);
                $instrucciones[] = $this->textoDerecha(440, $yFila, 'F1', 9, 'Bs ' . $pUnit);
                $instrucciones[] = $this->textoDerecha(535, $yFila, 'F1', 9, 'Bs ' . $subt);

                // Línea sutil de separación
                $instrucciones[] = '0.92 0.92 0.92 RG 0.3 w 50 ' . ($yFila - 5) . ' 495.28 0 re S';
                $yFila -= 18;
                $filasMostradas++;
            }
        }

        // Cuadro de Totales (Alineado a la derecha debajo de la tabla)
        $yTotales = max(280, $yFila - 20);
        $instrucciones[] = '0.96 0.96 0.96 rg 320 ' . ($yTotales - 70) . ' 225 80 re f';
        $instrucciones[] = '0.80 0.80 0.80 RG 0.5 w 320 ' . ($yTotales - 70) . ' 225 80 re S';

        $instrucciones[] = '0.30 0.30 0.30 rg';
        $instrucciones[] = $this->texto(335, $yTotales - 10, 'F1', 9, 'Total de la Operacion:');
        $instrucciones[] = $this->textoDerecha(535, $yTotales - 10, 'F1', 9, 'Bs ' . $totalOrigen);

        $instrucciones[] = '0.15 0.15 0.15 rg';
        $instrucciones[] = $this->texto(335, $yTotales - 32, 'F2', 11, 'MONTO COBRADO:');
        $instrucciones[] = '0.10 0.35 0.15 rg';
        $instrucciones[] = $this->textoDerecha(535, $yTotales - 32, 'F2', 12, 'Bs ' . $monto . ' ' . $moneda);

        $instrucciones[] = '0.30 0.30 0.30 rg';
        $instrucciones[] = $this->texto(335, $yTotales - 54, 'F1', 9, 'Saldo Pendiente:');
        $instrucciones[] = $this->textoDerecha(535, $yTotales - 54, 'F1', 9, 'Bs ' . $saldoRestante);

        // Detalle de Anulación si aplica
        if ($esAnulado) {
            $motivo = (string) ($recibo->motivo_anulacion ?: 'Sin motivo registrado');
            $fechaAnulado = $recibo->anulado_at
                ? $recibo->anulado_at->format('d/m/Y H:i:s')
                : 'N/D';

            $instrucciones[] = '1.0 0.94 0.94 rg 50 190 495.28 60 re f';
            $instrucciones[] = '0.85 0.25 0.25 RG 0.8 w 50 190 495.28 60 re S';

            $instrucciones[] = '0.80 0.10 0.10 rg';
            $instrucciones[] = $this->texto(65, 235, 'F2', 9, 'RECIBO ANULADO');
            $instrucciones[] = '0.30 0.30 0.30 rg';
            $instrucciones[] = $this->texto(160, 235, 'F1', 8, 'Fecha de anulacion: ' . $fechaAnulado);
            $instrucciones[] = '0.20 0.20 0.20 rg';
            $instrucciones[] = $this->texto(65, 218, 'F2', 8, 'Motivo:');
            $instrucciones[] = '0.25 0.25 0.25 rg';
            $instrucciones[] = $this->texto(110, 218, 'F1', 8, $this->truncar($motivo, 80));
            $instrucciones[] = '0.45 0.45 0.45 rg';
            $instrucciones[] = $this->texto(65, 200, 'F1', 7, 'Nota: La anulacion del recibo es exclusivamente documental y no altera el cobro monetario registrado.');
        }

        // Marca de Agua diagonal si está ANULADO
        if ($esAnulado) {
            // Matriz de transformación para rotación aproximada de 30 grados
            // q cos sin -sin cos tx ty cm
            $instrucciones[] = 'q 0.866 0.5 -0.5 0.866 170 360 cm';
            $instrucciones[] = '0.90 0.30 0.30 rg';
            $instrucciones[] = $this->texto(0, 0, 'F2', 64, 'ANULADO');
            $instrucciones[] = 'Q';
        }

        // Pie de página institucional y auditoría
        $instrucciones[] = '0.85 0.85 0.85 RG 0.5 w 50 90 495.28 0 re S';
        $instrucciones[] = '0.50 0.50 0.50 rg';
        $instrucciones[] = $this->texto(50, 75, 'F1', 7, 'Recibo generado por el Sistema Dulce Bocado - Microservicio de Pagos.');
        $instrucciones[] = $this->texto(50, 65, 'F1', 7, 'Trazabilidad: Operacion #' . $recibo->id_recibo . ' | Pago #' . $recibo->pago_id);
        $instrucciones[] = $this->textoDerecha(545, 75, 'F1', 7, 'Impreso el ' . date('d/m/Y H:i:s'));

        $stream = implode("\n", $instrucciones);

        return $this->compilarPdf($stream);
    }

    /**
     * Ensambla la estructura del archivo PDF 1.4 con catálogo, página, fuentes y tabla xref.
     */
    private function compilarPdf(string $stream): string
    {
        $objetos = [];

        // Objeto 1: Catálogo
        $objetos[1] = "<<\n/Type /Catalog\n/Pages 2 0 R\n>>";

        // Objeto 2: Pages
        $objetos[2] = "<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>";

        // Objeto 3: Page (A4: 595.28 x 841.89 puntos)
        $objetos[3] = "<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 595.28 841.89]\n/Resources <<\n  /Font <<\n    /F1 4 0 R\n    /F2 5 0 R\n  >>\n>>\n/Contents 6 0 R\n>>";

        // Objeto 4: Fuente Helvetica
        $objetos[4] = "<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n/Encoding /WinAnsiEncoding\n>>";

        // Objeto 5: Fuente Helvetica-Bold
        $objetos[5] = "<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica-Bold\n/Encoding /WinAnsiEncoding\n>>";

        // Objeto 6: Stream de contenido
        $longitud = strlen($stream);
        $objetos[6] = "<<\n/Length " . $longitud . "\n>>\nstream\n" . $stream . "\nendstream";

        $pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
        $offsets = [];

        for ($i = 1; $i <= 6; $i++) {
            $offsets[$i] = strlen($pdf);
            $pdf .= $i . " 0 obj\n" . $objetos[$i] . "\nendobj\n";
        }

        $inicioXref = strlen($pdf);
        $pdf .= "xref\n0 7\n";
        $pdf .= "0000000000 65535 f \n";

        for ($i = 1; $i <= 6; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }

        $pdf .= "trailer\n<<\n/Size 7\n/Root 1 0 R\n>>\n";
        $pdf .= "startxref\n" . $inicioXref . "\n%%EOF\n";

        return $pdf;
    }

    private function texto(
        float $x,
        float $y,
        string $fuente,
        float $tamano,
        string $texto
    ): string {
        return sprintf(
            'BT /%s %.2f Tf %.2f %.2f Td (%s) Tj ET',
            $fuente,
            $tamano,
            $x,
            $y,
            $this->escaparTexto($texto)
        );
    }

    private function textoDerecha(
        float $xDerecha,
        float $y,
        string $fuente,
        float $tamano,
        string $texto
    ): string {
        $anchoAprox = strlen($texto) * ($fuente === 'F2' ? 0.58 : 0.50) * $tamano;
        $x = max(50.0, $xDerecha - $anchoAprox);

        return $this->texto($x, $y, $fuente, $tamano, $texto);
    }

    private function escaparTexto(string $texto): string
    {
        $convertido = @iconv('UTF-8', 'Windows-1252//TRANSLIT', $texto);
        if ($convertido === false || $convertido === '') {
            $convertido = $texto;
        }

        return strtr($convertido, [
            '\\' => '\\\\',
            '(' => '\\(',
            ')' => '\\)',
        ]);
    }

    private function truncar(string $texto, int $limite): string
    {
        $texto = trim($texto);
        if (mb_strlen($texto) > $limite) {
            return mb_substr($texto, 0, $limite - 3) . '...';
        }

        return $texto;
    }
}
