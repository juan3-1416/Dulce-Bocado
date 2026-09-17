<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $titulo }}</title>
</head>

<body style="font-family: Arial, sans-serif; color: #334155; line-height: 1.5;">
    <div style="max-width: 620px; margin: 0 auto;">
        <h2 style="color: #be185d;">
            Dulce Bocado
        </h2>

        <p>
            Se ha generado el
            <strong>{{ $titulo }}</strong>.
        </p>

        <p>
            El documento PDF correspondiente se encuentra adjunto
            a este correo.
        </p>

        @if (!empty($reporte['filtros']))
            <p>
                El reporte fue generado utilizando los parámetros
                seleccionados en el sistema.
            </p>
        @endif

        <p style="margin-top: 30px; font-size: 12px; color: #64748b;">
            Sistema de Información Web Dulce Bocado
        </p>
    </div>
</body>
</html>