import { json } from '@sveltejs/kit';
import { ejecutarConsulta } from '$lib/servidor/conexion_mysql.js';
import crypto from 'crypto';

export async function GET({ url }) {
    try {
        const id_usuario_peticion = url.searchParams.get('id_usuario_admin');

        // Validar permisos (Solo Administrador)
        const [admin] = await ejecutarConsulta('SELECT r.nombre_rol FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?', [Number(id_usuario_peticion)]);
        if (!admin || admin.nombre_rol !== 'Administrador') {
            return json({ exito: false, mensaje: 'Acceso denegado. Solo los Administradores pueden gestionar usuarios.' }, { status: 403 });
        }

        const usuarios = await ejecutarConsulta(`
            SELECT 
                u.id_usuario, 
                u.nombre_completo, 
                u.nombre_usuario, 
                u.correo_electronico, 
                u.estado, 
                u.id_rol, 
                r.nombre_rol,
                u.fecha_creacion
            FROM usuarios u
            INNER JOIN roles r ON u.id_rol = r.id_rol
            ORDER BY u.id_usuario DESC
        `);

        return json({ exito: true, datos: usuarios });
    } catch (e) {
        return json({ exito: false, mensaje: 'Error al obtener usuarios', detalle: e.message }, { status: 500 });
    }
}

export async function POST({ request }) {
    try {
        const cuerpo = await request.json();
        const { id_usuario_admin, nombre_completo, nombre_usuario, correo_electronico, contrasena, id_rol } = cuerpo;

        // Validar admin
        const [admin] = await ejecutarConsulta('SELECT r.nombre_rol FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?', [Number(id_usuario_admin)]);
        if (!admin || admin.nombre_rol !== 'Administrador') {
            return json({ exito: false, mensaje: 'Acceso denegado.' }, { status: 403 });
        }

        // RN-001: Usuario o correo único
        const [existente] = await ejecutarConsulta('SELECT id_usuario FROM usuarios WHERE nombre_usuario = ? OR correo_electronico = ?', [nombre_usuario, correo_electronico]);
        if (existente) {
            return json({ exito: false, mensaje: 'El nombre de usuario o correo ya está registrado.' }, { status: 409 });
        }

        // Para este ERP, usaremos contraseñas planas para facilitar pruebas (o hash básico)
        // En producción sería bcrypt. Usaremos el hash SHA-256 para mayor seguridad real.
        const contrasenaHash = crypto.createHash('sha256').update(contrasena).digest('hex');

        await ejecutarConsulta(
            'INSERT INTO usuarios (nombre_completo, nombre_usuario, correo_electronico, contrasena_hash, id_rol, estado) VALUES (?, ?, ?, ?, ?, "activo")',
            [nombre_completo, nombre_usuario, correo_electronico, contrasenaHash, Number(id_rol)]
        );

        return json({ exito: true, mensaje: 'Usuario creado exitosamente.' });
    } catch (e) {
        return json({ exito: false, mensaje: 'Error al crear usuario.', detalle: e.message }, { status: 500 });
    }
}

export async function PUT({ request }) {
    try {
        const cuerpo = await request.json();
        const { id_usuario_admin, id_usuario, estado, id_rol } = cuerpo;

        const [admin] = await ejecutarConsulta('SELECT r.nombre_rol FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?', [Number(id_usuario_admin)]);
        if (!admin || admin.nombre_rol !== 'Administrador') {
            return json({ exito: false, mensaje: 'Acceso denegado.' }, { status: 403 });
        }

        if (Number(id_usuario) === 1 && estado === 'inactivo') {
            return json({ exito: false, mensaje: 'No puedes desactivar al Super Administrador principal.' }, { status: 403 });
        }

        await ejecutarConsulta(
            'UPDATE usuarios SET estado = ?, id_rol = ? WHERE id_usuario = ?',
            [estado, Number(id_rol), Number(id_usuario)]
        );

        return json({ exito: true, mensaje: 'Usuario actualizado correctamente.' });
    } catch (e) {
        return json({ exito: false, mensaje: 'Error al actualizar usuario.', detalle: e.message }, { status: 500 });
    }
}
