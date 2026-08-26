Dulce Bocado

Sistema de información web para la gestión de ventas, pedidos, producción e inventario de una pastelería y repostería.

Proyecto universitario desarrollado con una arquitectura cliente-servidor y un enfoque de monolito modular.

Tecnologías
Frontend: React + Vite + Tailwind CSS
Backend: Laravel + PHP
API: REST
Base de datos: PostgreSQL
Autenticación: Laravel Sanctum mediante sesión/cookies
Contenedores: Docker + Docker Compose
Control de versiones: Git / GitHub
1. Requisitos previos

Para ejecutar el proyecto solo es necesario tener instalados:

Git
Docker Desktop
Docker Compose

En Windows se recomienda utilizar Docker Desktop con WSL2 habilitado.

Verificar las instalaciones:

docker --version
docker compose version
git --version

No es necesario instalar localmente:

PHP
Composer
PostgreSQL
Node.js
npm

Todo se ejecuta mediante Docker.

2. Clonar el proyecto

Abrir PowerShell o una terminal y ubicarse en la carpeta donde se guardará el proyecto.

Ejemplo:

cd C:\Users\TU_USUARIO\Documents\GitHub

Clonar el repositorio:

git clone URL_DEL_REPOSITORIO

Entrar al proyecto:

cd Dulce-Bocado

La estructura principal es:

Dulce-Bocado/
│
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
└── README.md
3. Crear el .env principal

En la raíz del proyecto ejecutar:

Copy-Item .env.example .env

El archivo:

Dulce-Bocado/.env

debe contener una configuración similar a:

POSTGRES_DB=dulce_bocado
POSTGRES_USER=dulce_bocado
POSTGRES_PASSWORD=dulce_bocado_dev
POSTGRES_PORT=5432

Estas credenciales corresponden únicamente al entorno local de desarrollo.

4. Crear el .env de Laravel

Ejecutar:

Copy-Item .\backend\.env.example .\backend\.env

Abrir:

backend/.env

y verificar/modificar las siguientes variables:

APP_NAME="Dulce Bocado"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=dulce_bocado
DB_USERNAME=dulce_bocado
DB_PASSWORD=dulce_bocado_dev

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

QUEUE_CONNECTION=sync

CACHE_STORE=file

SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173

Para crear el Administrador inicial agregar:

ADMIN_NAME="Administrador Dulce Bocado"
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@dulcebocado.local
ADMIN_PASSWORD=Cambiar123!

La contraseña anterior es únicamente para desarrollo y puede reemplazarse por otra.

La contraseña elegida debe utilizarse posteriormente para iniciar sesión.

5. Construir los contenedores

Desde la raíz del proyecto ejecutar:

docker compose build

La primera ejecución puede tardar varios minutos porque Docker descargará las imágenes y dependencias necesarias.

6. Levantar PostgreSQL

Ejecutar:

docker compose up -d db

Comprobar el estado:

docker compose ps

El servicio:

dulce_bocado_db

debe aparecer como:

healthy
7. Instalar dependencias del backend

Como la carpeta vendor no se almacena en GitHub, instalar las dependencias de Laravel:

docker compose run --rm backend composer install
8. Generar la clave de Laravel

Ejecutar:

docker compose run --rm backend php artisan key:generate

Resultado esperado:

INFO  Application key set successfully.

Esto agregará automáticamente el valor de APP_KEY en:

backend/.env
9. Crear las tablas y datos iniciales

Ejecutar:

docker compose run --rm backend php artisan migrate --seed

Actualmente deben crearse las tablas de seguridad:

usuarios
roles
permisos
rol_permiso
usuario_rol_permiso

Laravel también crea:

migrations

Esta última es una tabla técnica del framework y no representa una entidad del negocio.

Los datos iniciales incluyen los roles:

Administrador
Vendedor
Producción

y los permisos básicos del módulo de seguridad.

También se crea el usuario Administrador definido mediante las variables ADMIN_* del archivo backend/.env.

10. Instalar dependencias del frontend

Ejecutar:

docker compose run --rm frontend npm install

Las dependencias se ejecutan dentro del contenedor; no es necesario tener Node.js instalado en Windows.

11. Levantar todo el proyecto

Ejecutar:

docker compose up -d

Después verificar:

docker compose ps

Deben aparecer los tres servicios:

dulce_bocado_db
dulce_bocado_backend
dulce_bocado_frontend

Los servicios deben aparecer activos y, cuando corresponda, con estado:

healthy
12. URLs del proyecto

Frontend React:

http://localhost:5173

Backend Laravel:

http://localhost:8000

Prueba de API:

http://localhost:8000/api/health

La ruta /api/health debe devolver información similar a:

{
    "status": "ok",
    "message": "API Dulce Bocado funcionando correctamente.",
    "backend": "Laravel",
    "database": {
        "connection": "pgsql",
        "name": "dulce_bocado",
        "user": "dulce_bocado"
    }
}
13. Iniciar sesión

Abrir:

http://localhost:5173

Utilizar el usuario configurado en backend/.env.

Con la configuración de ejemplo:

Usuario: admin
Contraseña: Cambiar123!

Después del inicio de sesión debe mostrarse el usuario Administrador junto con su rol y permisos.

La autenticación utiliza Laravel Sanctum mediante sesión y cookies.

14. Reglas de autenticación actuales

El sistema implementa las siguientes reglas:

Contraseña mínima:       8 caracteres
Debe contener:           mayúscula
                         minúscula
                         número
                         carácter especial

Intentos permitidos:     5
Duración del bloqueo:    15 minutos

Después de cinco contraseñas incorrectas consecutivas, el usuario queda bloqueado temporalmente.

Un inicio de sesión exitoso reinicia el contador de intentos fallidos.

15. Verificar PostgreSQL

Para comprobar que PostgreSQL funciona:

docker compose exec db psql -U dulce_bocado -d dulce_bocado -c "\dt"

Para revisar los usuarios registrados:

docker compose exec db psql -U dulce_bocado -d dulce_bocado -c "SELECT id_usuario, nombre, nombre_usuario, correo_electronico, activo FROM usuarios;"
16. Comandos útiles

Ver estado de los contenedores:

docker compose ps

Ver logs del backend:

docker compose logs backend --tail=100

Ver logs del frontend:

docker compose logs frontend --tail=100

Ver logs de PostgreSQL:

docker compose logs db --tail=100

Reiniciar frontend:

docker compose restart frontend

Reiniciar backend:

docker compose restart backend

Reiniciar todo:

docker compose restart

Detener el proyecto:

docker compose down

Volver a levantarlo:

docker compose up -d
17. Después del primer inicio

Una vez configurado el proyecto por primera vez, normalmente para trabajar solo será necesario ejecutar:

docker compose up -d

Abrir:

http://localhost:5173

Y al terminar:

docker compose down
18. Actualizar el proyecto desde GitHub

Antes de comenzar a trabajar:

git pull

Si hubo cambios en las dependencias del backend:

docker compose exec backend composer install

Si hubo cambios en las dependencias del frontend:

docker compose exec frontend npm install

Si existen nuevas migraciones:

docker compose exec backend php artisan migrate

Después:

docker compose restart
19. Problemas frecuentes
El puerto 5432 ya está ocupado

Puede existir una instalación local de PostgreSQL utilizando ese puerto.

Se puede detener temporalmente el PostgreSQL local o modificar:

POSTGRES_PORT=5433

en el .env raíz.

La comunicación interna Laravel → PostgreSQL continuará utilizando:

db:5432
El puerto 8000 está ocupado

Verificar qué programa utiliza el puerto o cerrarlo antes de iniciar Docker.

El backend utiliza:

http://localhost:8000
El puerto 5173 está ocupado

Cerrar el programa que esté utilizando el puerto antes de iniciar el frontend.

El frontend utiliza:

http://localhost:5173
Laravel muestra errores después de cambiar .env

Ejecutar:

docker compose exec backend php artisan optimize:clear
El backend no encuentra vendor/autoload.php

Ejecutar:

docker compose run --rm backend composer install
El frontend no encuentra una dependencia

Ejecutar:

docker compose exec frontend npm install
20. Reiniciar completamente la base de datos

ADVERTENCIA: este procedimiento elimina todos los datos almacenados en PostgreSQL.

Solo utilizarlo cuando realmente se quiera comenzar desde cero:

docker compose down -v

Luego:

docker compose up -d db
docker compose run --rm backend php artisan migrate --seed
docker compose up -d
21. Flujo recomendado de trabajo en Git

Antes de comenzar:

git pull

Crear o utilizar la rama asignada.

Después de realizar cambios:

git status
git add .
git commit -m "Descripción del cambio"
git push

No subir a GitHub archivos .env, contraseñas reales ni otras credenciales.

Estado actual

La infraestructura base se encuentra configurada con:

React + Vite + Tailwind
        ↓
     API REST
        ↓
 Laravel + Sanctum
        ↓
   PostgreSQL

Actualmente se encuentra implementada la infraestructura inicial y la base del módulo de seguridad, incluyendo autenticación, sesión, roles, permisos y bloqueo temporal por intentos fallidos.

Integrantes

Proyecto universitario de Ingeniería en Sistemas.

Dulce Bocado — 2026