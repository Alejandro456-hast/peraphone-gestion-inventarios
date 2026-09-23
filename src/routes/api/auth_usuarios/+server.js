/**
 * Microservicio de Autenticación de Usuarios y Control de Roles
 * Reglas de Negocio:
 * - RN-001: Autenticación estricta con credenciales válidas; usuarios externos o inactivos bloqueados.
 * - RN-002: Control de acceso según funciones (Administrador, Vendedor, Personal de Inventario, Servicio Técnico).
 */
import { json } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { ejecutarConsulta } from '$lib/servidor/conexion_mysql.js';

export async function POST({ request, cookies }) {
    try {
        const cuerpo = await request.json();
        const { nombre_usuario, contrasena } = cuerpo;

        // Validación de datos de entrada
        if (!nombre_usuario || !contrasena) {
            return json(
                {
                    exito: false,
                    mensaje: 'Debe ingresar el nombre de usuario y la contraseña.'
                },
                { status: 400 }
            );
        }

        // Hasheo seguro con SHA-256 (compatible con el script SQL inicial)
        const contrasenaHasheada = crypto.createHash('sha256').update(contrasena).digest('hex');

        // Búsqueda del usuario con su rol asociado
        const consultaUsuario = `
            SELECT 
                u.id_usuario,
                u.id_rol,
                r.nombre_rol,
                u.nombre_completo,
                u.nombre_usuario,
                u.correo_electronico,
                u.contrasena_hash,
                u.estado
            FROM usuarios u
            INNER JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.nombre_usuario = ? OR u.correo_electronico = ?
            LIMIT 1
        `;

        const [usuarioEncontrado] = await ejecutarConsulta(consultaUsuario, [nombre_usuario, nombre_usuario]);

        // Verificación de existencia
        if (!usuarioEncontrado) {
            return json(
                {
                    exito: false,
                    mensaje: 'Credenciales inválidas. Usuario no registrado en Peraphone.'
                },
                { status: 401 }
            );
        }

        // RN-001: Bloqueo inmediato si el usuario está inactivo o suspendido
        if (usuarioEncontrado.estado !== 'activo') {
            return json(
                {
                    exito: false,
                    mensaje: 'Acceso denegado. Este usuario se encuentra inactivo o bloqueado. Contacte a Luis Baldivieso.'
                },
                { status: 403 }
            );
        }

        // Validación de contraseña (permite coincidencia con hash SHA-256 o texto plano en desarrollo)
        const claveValida = (usuarioEncontrado.contrasena_hash === contrasenaHasheada) || 
                            (usuarioEncontrado.contrasena_hash === contrasena);

        if (!claveValida) {
            return json(
                {
                    exito: false,
                    mensaje: 'Contraseña incorrecta. Verifique sus credenciales.'
                },
                { status: 401 }
            );
        }

        // Definición de permisos según rol (RN-002)
        const esAdministrador = usuarioEncontrado.nombre_rol === 'Administrador';
        const permisos = {
            puede_ver_todo: esAdministrador,
            puede_registrar_inventario: esAdministrador || usuarioEncontrado.nombre_rol === 'Personal de Inventario',
            puede_vender: esAdministrador || usuarioEncontrado.nombre_rol === 'Vendedor',
            puede_evaluar_tecnico: esAdministrador || usuarioEncontrado.nombre_rol === 'Servicio Técnico',
            puede_auditar: esAdministrador
        };

        // Generar identificador de sesión seguro
        const tokenSesion = crypto.randomBytes(32).toString('hex');

        // Configurar cookie de sesión segura
        cookies.set('peraphone_sesion', tokenSesion, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            secure: false, // Permitir en desarrollo local HTTP
            maxAge: 60 * 60 * 24 // 24 horas
        });

        return json({
            exito: true,
            mensaje: `Bienvenido al sistema Peraphone, ${usuarioEncontrado.nombre_completo}.`,
            usuario: {
                id_usuario: usuarioEncontrado.id_usuario,
                nombre_completo: usuarioEncontrado.nombre_completo,
                nombre_usuario: usuarioEncontrado.nombre_usuario,
                correo_electronico: usuarioEncontrado.correo_electronico,
                id_rol: usuarioEncontrado.id_rol,
                nombre_rol: usuarioEncontrado.nombre_rol,
                permisos: permisos
            }
        });
    } catch (error) {
        console.error('Error en microservicio auth_usuarios:', error);
        return json(
            {
                exito: false,
                mensaje: 'Error interno en el servidor de autenticación.',
                detalle: error.message
            },
            { status: 500 }
        );
    }
}

export async function DELETE({ cookies }) {
    cookies.delete('peraphone_sesion', { path: '/' });
    return json({
        exito: true,
        mensaje: 'Sesión cerrada correctamente.'
    });
}
