/**
 * Microservicio del Taller y Servicio Técnico
 * RN-008: Dictamen técnico (evaluación, reparación, desecho)
 * RN-009: Trazabilidad inmutable de los diagnósticos
 */
import { json } from '@sveltejs/kit';
import { ejecutarConsulta, ejecutarTransaccion } from '$lib/servidor/conexion_mysql.js';

export async function POST({ request }) {
    try {
        const cuerpo = await request.json();
        const {
            id_celular,
            nuevo_estado,
            diagnostico,
            id_usuario_tecnico
        } = cuerpo;

        if (!id_celular || !nuevo_estado || !diagnostico) {
            return json({ exito: false, mensaje: 'Faltan datos obligatorios (celular, estado, diagnóstico).' }, { status: 400 });
        }

        // Validar estados permitidos en servicio técnico
        const estadosValidos = ['disponible', 'en_reparacion', 'desechado'];
        if (!estadosValidos.includes(nuevo_estado)) {
            return json({ exito: false, mensaje: 'El nuevo estado no es válido para una evaluación técnica.' }, { status: 400 });
        }

        // RN-002: Verificar permisos (Solo Técnico y Admin)
        const [usuarioResp] = await ejecutarConsulta(
            'SELECT u.id_usuario, r.nombre_rol FROM usuarios u INNER JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?',
            [Number(id_usuario_tecnico)]
        );

        if (!usuarioResp || (usuarioResp.nombre_rol !== 'Servicio Técnico' && usuarioResp.nombre_rol !== 'Administrador')) {
            return json({ exito: false, mensaje: 'Acceso denegado (RN-002). Solo un Técnico o Administrador puede emitir un dictamen.' }, { status: 403 });
        }

        // Obtener el estado actual del equipo para verificar que realmente está en revisión/reparación
        const [equipo] = await ejecutarConsulta('SELECT numero_imei, estado_equipo FROM celulares WHERE id_celular = ?', [Number(id_celular)]);
        if (!equipo) {
            return json({ exito: false, mensaje: 'El celular especificado no existe.' }, { status: 404 });
        }

        if (equipo.estado_equipo !== 'en_revision' && equipo.estado_equipo !== 'en_reparacion') {
            return json({ exito: false, mensaje: `El equipo no requiere servicio técnico actualmente (Estado actual: ${equipo.estado_equipo}).` }, { status: 409 });
        }

        // RN-008 y RN-009: Transacción Atómica para el Dictamen
        await ejecutarTransaccion(async (conexion) => {
            // 1. Actualizar estado del celular
            await conexion.execute(
                'UPDATE celulares SET estado_equipo = ? WHERE id_celular = ?',
                [nuevo_estado, Number(id_celular)]
            );

            // 2. Registrar movimiento / Trazabilidad
            const motivoTrace = `DIAGNOSTICO: ${diagnostico.substring(0, 150)}`;
            const ubicacionDestino = nuevo_estado === 'disponible' ? 'Almacén Central (Reparado)' : 
                                     nuevo_estado === 'desechado' ? 'Basurero Electrónico (E-Waste)' : 
                                     'Mesa de Reparación';

            await conexion.execute(
                `INSERT INTO movimientos (
                    id_celular, tipo_movimiento, motivo, id_usuario_responsable,
                    ubicacion_origen, ubicacion_destino, es_automatico
                ) VALUES (?, 'AJUSTE', ?, ?, 'Laboratorio Técnico', ?, TRUE)`,
                [
                    Number(id_celular),
                    motivoTrace,
                    Number(id_usuario_tecnico),
                    ubicacionDestino
                ]
            );
        });

        return json({
            exito: true,
            mensaje: `Dictamen registrado. Equipo (IMEI: ${equipo.numero_imei}) marcado como ${nuevo_estado.toUpperCase()}.`
        });

    } catch (error) {
        console.error('Error en POST /api/servicio_tecnico:', error);
        return json({ exito: false, mensaje: 'Error interno al procesar el dictamen técnico.', detalle: error.message }, { status: 500 });
    }
}
