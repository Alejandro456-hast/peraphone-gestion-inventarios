/**
 * Microservicio de Gestión de Devoluciones y Dictamen Técnico
 * Reglas de Negocio:
 * - RN-007: Devoluciones (Registro de cliente, motivo y cambio forzoso del celular a 'en_revision').
 * - RN-008: Evaluación de Servicio Técnico (Decisión: 'disponible', 'en_reparacion' o 'desechado').
 *   Bloqueo de venta mientras el equipo esté en revisión.
 */
import { json } from '@sveltejs/kit';
import { ejecutarConsulta, ejecutarTransaccion } from '$lib/servidor/conexion_mysql.js';

/**
 * Consulta las devoluciones y equipos actualmente en revisión técnica
 */
export async function GET() {
    try {
        const consultaEquiposEnRevision = `
            SELECT 
                d.id_devolucion,
                d.fecha_devolucion,
                d.nombre_cliente,
                d.contacto_cliente,
                d.motivo_devolucion,
                d.estado_resolucion,
                c.id_celular,
                c.numero_imei,
                c.marca,
                c.modelo,
                c.color,
                c.estado_equipo,
                u.nombre_completo AS receptor
            FROM devoluciones d
            INNER JOIN celulares c ON d.id_celular = c.id_celular
            INNER JOIN usuarios u ON d.id_usuario_receptor = u.id_usuario
            ORDER BY d.fecha_devolucion DESC
        `;
        const devoluciones = await ejecutarConsulta(consultaEquiposEnRevision);

        return json({
            exito: true,
            total: devoluciones.length,
            datos: devoluciones
        });
    } catch (error) {
        console.error('Error en GET /api/gestion_retornos:', error);
        return json(
            {
                exito: false,
                mensaje: 'Error al consultar las devoluciones en revisión.',
                detalle: error.message
            },
            { status: 500 }
        );
    }
}

/**
 * Registro de Devolución de Cliente (RN-007)
 * Bloquea el celular pasando su estado a 'en_revision'
 */
export async function POST({ request }) {
    try {
        const cuerpo = await request.json();
        const {
            numero_imei,
            nombre_cliente,
            contacto_cliente = '',
            motivo_devolucion,
            id_usuario_receptor = 1
        } = cuerpo;

        // Validación de datos mínimos requeridos
        if (!numero_imei || !nombre_cliente || !motivo_devolucion) {
            return json(
                {
                    exito: false,
                    mensaje: 'Debe ingresar el IMEI del equipo, el nombre del cliente y el motivo de la devolución.'
                },
                { status: 400 }
            );
        }

        // Buscar el celular en la base de datos
        const [celularExistente] = await ejecutarConsulta(
            'SELECT id_celular, estado_equipo, marca, modelo FROM celulares WHERE numero_imei = ? LIMIT 1',
            [String(numero_imei).trim()]
        );

        if (!celularExistente) {
            return json(
                {
                    exito: false,
                    mensaje: `El IMEI ${numero_imei} no existe en el sistema de Peraphone.`
                },
                { status: 404 }
            );
        }

        // Ejecutar registro de devolución en transacción atómica (RN-007)
        await ejecutarTransaccion(async (conexion) => {
            // 1. Cambiar estado del celular inmediatamente a 'en_revision'
            await conexion.execute(
                "UPDATE celulares SET estado_equipo = 'en_revision' WHERE id_celular = ?",
                [celularExistente.id_celular]
            );

            // 2. Insertar registro de devolución
            const [resultadoDevolucion] = await conexion.execute(
                `INSERT INTO devoluciones (
                    id_celular, id_usuario_receptor, nombre_cliente, 
                    contacto_cliente, motivo_devolucion, estado_resolucion
                ) VALUES (?, ?, ?, ?, ?, 'pendiente_evaluacion')`,
                [
                    celularExistente.id_celular,
                    Number(id_usuario_receptor) || 1,
                    nombre_cliente.trim(),
                    contacto_cliente.trim(),
                    motivo_devolucion.trim()
                ]
            );

            // 3. Registrar movimiento de auditoría (RN-005)
            await conexion.execute(
                `INSERT INTO movimientos (
                    id_celular, tipo_movimiento, motivo, id_usuario_responsable,
                    ubicacion_origen, ubicacion_destino, es_automatico
                ) VALUES (?, 'TRASLADO', ?, ?, 'Punto de Venta', 'Taller Servicio Técnico', TRUE)`,
                [
                    celularExistente.id_celular,
                    `DEVOLUCION_CLIENTE_${resultadoDevolucion.insertId}: ${motivo_devolucion.slice(0, 100)}`,
                    Number(id_usuario_receptor) || 1
                ]
            );
        });

        return json({
            exito: true,
            mensaje: `Devolución procesada. El equipo ${celularExistente.marca} ${celularExistente.modelo} (IMEI: ${numero_imei}) ha quedado bloqueado en estado 'En Revisión'.`
        });
    } catch (error) {
        console.error('Error en POST /api/gestion_retornos:', error);
        return json(
            {
                exito: false,
                mensaje: 'Error al registrar la devolución del celular.',
                detalle: error.message
            },
            { status: 500 }
        );
    }
}

/**
 * Evaluación y Dictamen de Servicio Técnico (RN-008)
 * Transiciones permitidas desde 'en_revision': 'disponible', 'en_reparacion', 'desechado'
 */
export async function PUT({ request }) {
    try {
        const cuerpo = await request.json();
        const {
            id_celular,
            id_devolucion = null,
            dictamen_final,
            diagnostico_detallado,
            id_usuario_tecnico = 1
        } = cuerpo;

        const DICTAMENES_VALIDOS = ['disponible', 'en_reparacion', 'desechado'];

        if (!id_celular || !dictamen_final || !diagnostico_detallado) {
            return json(
                {
                    exito: false,
                    mensaje: 'Faltan datos requeridos: id_celular, dictamen_final y diagnostico_detallado son obligatorios.'
                },
                { status: 400 }
            );
        }

        if (!DICTAMENES_VALIDOS.includes(dictamen_final)) {
            return json(
                {
                    exito: false,
                    mensaje: `Dictamen no válido. Las opciones permitidas son: ${DICTAMENES_VALIDOS.join(', ')}.`
                },
                { status: 400 }
            );
        }
        // RN-002: Verificar que el usuario tenga rol Servicio Técnico o Administrador
        const [usuarioTecnico] = await ejecutarConsulta(
            'SELECT u.id_usuario, r.nombre_rol FROM usuarios u INNER JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?',
            [Number(id_usuario_tecnico)]
        );

        if (!usuarioTecnico || (usuarioTecnico.nombre_rol !== 'Servicio Técnico' && usuarioTecnico.nombre_rol !== 'Administrador')) {
            return json(
                {
                    exito: false,
                    mensaje: 'Acceso denegado (RN-002): Solo el personal de Servicio Técnico o Administrador puede emitir evaluaciones técnicas.'
                },
                { status: 403 }
            );
        }
        // Verificar el celular y su estado actual
        const [celular] = await ejecutarConsulta(
            'SELECT id_celular, numero_imei, marca, modelo, estado_equipo FROM celulares WHERE id_celular = ? LIMIT 1',
            [Number(id_celular)]
        );

        if (!celular) {
            return json(
                { exito: false, mensaje: 'Celular no encontrado.' },
                { status: 404 }
            );
        }

        // RN-008: Transacción atómica de dictamen técnico
        await ejecutarTransaccion(async (conexion) => {
            // 1. Actualizar estado del celular según decisión técnica
            await conexion.execute(
                'UPDATE celulares SET estado_equipo = ? WHERE id_celular = ?',
                [dictamen_final, celular.id_celular]
            );

            // 2. Insertar registro formal de evaluación técnica
            await conexion.execute(
                `INSERT INTO evaluaciones_tecnicas (
                    id_devolucion, id_celular, id_usuario_tecnico,
                    dictamen_final, diagnostico_detallado
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    id_devolucion ? Number(id_devolucion) : null,
                    celular.id_celular,
                    Number(id_usuario_tecnico) || 1,
                    dictamen_final,
                    diagnostico_detallado.trim()
                ]
            );

            // 3. Si estaba ligado a una devolución, marcarla como resuelta
            if (id_devolucion) {
                await conexion.execute(
                    "UPDATE devoluciones SET estado_resolucion = 'resuelto' WHERE id_devolucion = ?",
                    [Number(id_devolucion)]
                );
            }

            // 4. Registrar movimiento de auditoría y trazabilidad
            const destinoUbicacion = dictamen_final === 'disponible' 
                ? 'Vitrina / Almacén Central (Listo para Venta)' 
                : dictamen_final === 'en_reparacion' 
                    ? 'Banco de Trabajo Técnico' 
                    : 'Zona de Scrap / Desecho';

            await conexion.execute(
                `INSERT INTO movimientos (
                    id_celular, tipo_movimiento, motivo, id_usuario_responsable,
                    ubicacion_origen, ubicacion_destino, es_automatico
                ) VALUES (?, 'AJUSTE', ?, ?, 'Taller Servicio Técnico', ?, TRUE)`,
                [
                    celular.id_celular,
                    `DICTAMEN_TECNICO_${dictamen_final.toUpperCase()}: ${diagnostico_detallado.slice(0, 100)}`,
                    Number(id_usuario_tecnico) || 1,
                    destinoUbicacion
                ]
            );
        });

        return json({
            exito: true,
            mensaje: `Dictamen registrado con éxito. El equipo ${celular.marca} ${celular.modelo} cambió su estado a '${dictamen_final}'.`
        });
    } catch (error) {
        console.error('Error en PUT /api/gestion_retornos:', error);
        return json(
            {
                exito: false,
                mensaje: 'Error interno al guardar la evaluación de servicio técnico.',
                detalle: error.message
            },
            { status: 500 }
        );
    }
}
