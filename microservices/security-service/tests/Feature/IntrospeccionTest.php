<?php

namespace Tests\Feature;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class IntrospeccionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.internal_service.key', 'clave-de-prueba');
    }

    private function usuarioConPermiso(): Usuario
    {
        $usuario = Usuario::create([
            'nombre' => 'Vendedor de prueba',
            'nombre_usuario' => 'vendedor_test',
            'correo_electronico' => 'vendedor@example.test',
            'contrasena' => Hash::make('Prueba123!'),
            'activo' => true,
        ]);
        $rol = Rol::create(['nombre' => 'Vendedor', 'activo' => true]);
        $permiso = Permiso::create(['nombre' => 'ventas.crear', 'activo' => true]);
        $relacion = RolPermiso::create(['rol_id' => $rol->id_rol, 'permiso_id' => $permiso->id_permiso]);
        UsuarioRolPermiso::create(['usuario_id' => $usuario->id_usuario, 'rol_permiso_id' => $relacion->id_rol_permiso]);

        return $usuario;
    }

    private function consultar(?string $token, ?string $clave = 'clave-de-prueba')
    {
        $headers = [];
        if ($token !== null) {
            $headers['Authorization'] = 'Bearer '.$token;
        }
        if ($clave !== null) {
            $headers['X-Internal-Service-Key'] = $clave;
        }

        return $this->postJson('/api/internal/introspect', [], $headers);
    }

    public function test_rechaza_credencial_de_servicio_ausente_o_incorrecta(): void
    {
        $token = $this->usuarioConPermiso()->createToken('prueba')->plainTextToken;

        $this->consultar($token, null)->assertForbidden();
        $this->consultar($token, 'incorrecta')->assertForbidden();
        config()->set('services.internal_service.key', '');
        $this->consultar($token, 'clave-de-prueba')->assertForbidden();
    }

    public function test_devuelve_identidad_y_permisos_con_token_vigente(): void
    {
        $usuario = $this->usuarioConPermiso();
        $token = $usuario->createToken('prueba')->plainTextToken;

        $this->consultar($token)
            ->assertOk()
            ->assertJsonPath('usuario.id_usuario', $usuario->id_usuario)
            ->assertJsonPath('usuario.permisos.0', 'ventas.crear')
            ->assertDontSee('contrasena');
    }

    public function test_rechaza_token_ausente_revocado_o_usuario_inactivo(): void
    {
        $usuario = $this->usuarioConPermiso();
        $token = $usuario->createToken('prueba')->plainTextToken;

        $this->consultar(null)->assertUnauthorized();
        $usuario->update(['activo' => false]);
        $this->consultar($token)->assertUnauthorized();
        $usuario->update(['activo' => true]);
        $usuario->tokens()->delete();
        $this->consultar($token)->assertUnauthorized();
    }

    public function test_cambio_de_permiso_tiene_efecto_en_la_siguiente_peticion(): void
    {
        $usuario = $this->usuarioConPermiso();
        $token = $usuario->createToken('prueba')->plainTextToken;

        Permiso::where('nombre', 'ventas.crear')->update(['activo' => false]);

        $this->consultar($token)->assertOk()->assertJsonCount(0, 'usuario.permisos');
    }

    public function test_rechaza_token_expirado_y_rol_inactivo_no_concede_permiso(): void
    {
        $usuario = $this->usuarioConPermiso();
        $token = $usuario->createToken('prueba')->plainTextToken;

        Rol::where('nombre', 'Vendedor')->update(['activo' => false]);
        $this->consultar($token)->assertOk()->assertJsonCount(0, 'usuario.permisos');

        $usuario->tokens()->first()->update(['expires_at' => now()->subMinute()]);
        $this->consultar($token)->assertUnauthorized();
    }

    public function test_login_me_y_logout_siguen_funcionando_y_revocan_introspeccion(): void
    {
        $this->usuarioConPermiso();

        $token = $this->postJson('/api/auth/login', [
            'nombre_usuario' => 'vendedor_test',
            'contrasena' => 'Prueba123!',
        ])->assertOk()->json('token');

        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$token])
            ->assertOk()
            ->assertJsonPath('usuario.nombre_usuario', 'vendedor_test');

        $this->postJson('/api/auth/logout', [], ['Authorization' => 'Bearer '.$token])
            ->assertOk();

        $this->consultar($token)->assertUnauthorized();
    }
}
