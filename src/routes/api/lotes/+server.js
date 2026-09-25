/**
 * Microservicio de Consulta y Gestión de Lotes
 * Regla de Negocio RN-004: Agrupación y trazabilidad de lotes recibidos.
 */
import { json } from '@sveltejs/kit';
import { ejecutarConsulta } from '$lib/servidor/conexion_mysql.js';

export async function GET() {
    try {
        const consultaLotes = `
            SELECT 
                l.id_lote,
                l.codigo_lote,
                l.descripcion,
                l.proveedor,
                l.fecha_recepcion,
                l.estado_lote,
                COUNT(c.id_celular) AS total_equipos
            FROM lotes l
            LEFT JOIN celulares c ON l.id_lote = c.id_lote
            GROUP BY l.id_lote
            ORDER BY l.fecha_recepcion DESC
        `;
        const lotes = await ejecutarConsulta(consultaLotes);
        return json({
            exito: true,
            total: lotes.length,
            datos: lotes
        });
    } catch (error) {
        return json(
            {
                exito: false,
                mensaje: 'Error al obtener el listado de lotes.',
                detalle: error.message
            },
            { status: 500 }
        );
    }
}

export async function POST({ request }) {
    try {
        const cuerpo = await request.json();
        const {
            codigo_lote,
            descripcion,
            proveedor,
            estado_lote = 'abierto',
            id_usuario_responsable = 1
        } = cuerpo;

        if (!codigo_lote || !proveedor) {
            return json(
                { exito: false, mensaje: 'El código del lote y proveedor son requeridos.' },
                { status: 400 }
            );
        }

        // RN-002: Verificar permisos
        const [usuarioResponsable] = await ejecutarConsulta(
            'SELECT u.id_usuario, r.nombre_rol FROM usuarios u INNER JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?',
            [Number(id_usuario_responsable)]
        );

        if (!usuarioResponsable || (usuarioResponsable.nombre_rol !== 'Personal de Inventario' && usuarioResponsable.nombre_rol !== 'Administrador')) {
            return json(
                { exito: false, mensaje: 'Acceso denegado (RN-002).' },
                { status: 403 }
            );
        }

        const resultado = await ejecutarConsulta(
            `INSERT INTO lotes (codigo_lote, descripcion, proveedor, estado_lote, fecha_recepcion) VALUES (?, ?, ?, ?, CURRENT_DATE())`,
            [codigo_lote.trim(), descripcion?.trim() || '', proveedor.trim(), estado_lote]
        );

        return json(
            {
                exito: true,
                mensaje: `Lote ${codigo_lote} creado exitosamente.`,
                datos: { id_lote: resultado.insertId, codigo_lote }
            },
            { status: 201 }
        );
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return json({ exito: false, mensaje: 'Ya existe un lote con ese código.' }, { status: 409 });
        }
        return json({ exito: false, mensaje: 'Error al crear el lote.', detalle: error.message }, { status: 500 });
    }
}

export async function PUT({ request }) {
    try {
        const cuerpo = await request.json();
        const {
            id_lote,
            codigo_lote,
            descripcion,
            proveedor,
            estado_lote,
            id_usuario_responsable = 1
        } = cuerpo;

        if (!id_lote || !codigo_lote || !proveedor) {
            return json({ exito: false, mensaje: 'Faltan datos obligatorios para actualizar.' }, { status: 400 });
        }

        // RN-002: Verificar permisos
        const [usuarioResponsable] = await ejecutarConsulta(
            'SELECT u.id_usuario, r.nombre_rol FROM usuarios u INNER JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?',
            [Number(id_usuario_responsable)]
        );

        if (!usuarioResponsable || (usuarioResponsable.nombre_rol !== 'Personal de Inventario' && usuarioResponsable.nombre_rol !== 'Administrador')) {
            return json({ exito: false, mensaje: 'Acceso denegado (RN-002).' }, { status: 403 });
        }

        await ejecutarConsulta(
            `UPDATE lotes SET codigo_lote = ?, descripcion = ?, proveedor = ?, estado_lote = ? WHERE id_lote = ?`,
            [codigo_lote.trim(), descripcion?.trim() || '', proveedor.trim(), estado_lote, Number(id_lote)]
        );

        return json({ exito: true, mensaje: `Lote ${codigo_lote} actualizado correctamente.` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return json({ exito: false, mensaje: 'El código del lote ya está en uso por otro lote.' }, { status: 409 });
        }
        return json({ exito: false, mensaje: 'Error al actualizar el lote.', detalle: error.message }, { status: 500 });
    }
}

export async function DELETE({ url }) {
    try {
        const id_lote = url.searchParams.get('id');
        const id_usuario = url.searchParams.get('id_usuario'); // Para verificar permisos

        if (!id_lote) return json({ exito: false, mensaje: 'ID de lote no proporcionado.' }, { status: 400 });

        // RN-002: Verificar permisos
        const [usuarioResponsable] = await ejecutarConsulta(
            'SELECT u.id_usuario, r.nombre_rol FROM usuarios u INNER JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?',
            [Number(id_usuario)]
        );

        if (!usuarioResponsable || (usuarioResponsable.nombre_rol !== 'Personal de Inventario' && usuarioResponsable.nombre_rol !== 'Administrador')) {
            return json({ exito: false, mensaje: 'Acceso denegado (RN-002).' }, { status: 403 });
        }

        // Verificar si el lote tiene equipos antes de borrar (protección de integridad)
        const [conteo] = await ejecutarConsulta('SELECT COUNT(*) as total FROM celulares WHERE id_lote = ?', [Number(id_lote)]);
        if (conteo.total > 0) {
            return json({ 
                exito: false, 
                mensaje: `No se puede eliminar: El lote contiene ${conteo.total} equipo(s). Elimínelos o reasígnelos primero.` 
            }, { status: 409 });
        }

        await ejecutarConsulta('DELETE FROM lotes WHERE id_lote = ?', [Number(id_lote)]);

        return json({ exito: true, mensaje: 'Lote eliminado de la base de datos permanentemente.' });
    } catch (error) {
        return json({ exito: false, mensaje: 'Error interno al intentar eliminar el lote.', detalle: error.message }, { status: 500 });
    }
}
