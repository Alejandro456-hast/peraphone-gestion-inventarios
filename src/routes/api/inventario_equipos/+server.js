/**
 * Microservicio de Inventario de Equipos Celulares
 * Reglas de Negocio:
 * - RN-003: Registro mínimo obligatorio (IMEI de 15 dígitos, marca, modelo) y control de estados.
 * - RN-004: Agrupación por lotes o registro individual sin lote (id_lote = null).
 * - RN-005: Registro automático e inmutable del movimiento de entrada (RECEPCION_INICIAL).
 * - RN-009: Trazabilidad completa por celular (consulta de movimientos históricos).
 */
import { json } from '@sveltejs/kit';
import { ejecutarConsulta, ejecutarTransaccion } from '$lib/servidor/conexion_mysql.js';

// Estados válidos según la regla de negocio RN-003
const ESTADOS_PERMITIDOS = [
    'pendiente_recepcion',
    'disponible',
    'vendido',
    'en_revision',
    'en_reparacion',
    'desechado'
];

/**
 * Consulta de inventario con filtros de búsqueda y métricas agregadas
 */
export async function GET({ url }) {
    try {
        const parametroBusqueda = url.searchParams.get('busqueda') || '';
        const filtroEstado = url.searchParams.get('estado') || '';
        const filtroLote = url.searchParams.get('id_lote') || '';
        const imeiTrazabilidad = url.searchParams.get('imei_trazabilidad') || '';

        // RN-009: Si se solicita el historial de trazabilidad de un equipo específico
        if (imeiTrazabilidad) {
            const consultaTrazabilidad = `
                SELECT 
                    m.id_movimiento,
                    m.tipo_movimiento,
                    m.motivo,
                    m.fecha_hora,
                    m.ubicacion_origen,
                    m.ubicacion_destino,
                    m.es_automatico,
                    u.nombre_completo AS responsable,
                    r.nombre_rol AS rol_responsable
                FROM movimientos m
                INNER JOIN celulares c ON m.id_celular = c.id_celular
                INNER JOIN usuarios u ON m.id_usuario_responsable = u.id_usuario
                INNER JOIN roles r ON u.id_rol = r.id_rol
                WHERE c.numero_imei = ?
                ORDER BY m.fecha_hora ASC
            `;
            const movimientos = await ejecutarConsulta(consultaTrazabilidad, [imeiTrazabilidad]);

            const [detalleCelular] = await ejecutarConsulta(
                `SELECT c.*, l.codigo_lote FROM celulares c LEFT JOIN lotes l ON c.id_lote = l.id_lote WHERE c.numero_imei = ? LIMIT 1`,
                [imeiTrazabilidad]
            );

            return json({
                exito: true,
                celular: detalleCelular || null,
                historial_movimientos: movimientos
            });
        }

        // Construcción dinámica de consulta de celulares
        let clausulaWhere = 'WHERE 1=1';
        const parametros = [];

        if (parametroBusqueda) {
            clausulaWhere += ' AND (c.numero_imei LIKE ? OR c.marca LIKE ? OR c.modelo LIKE ?)';
            const termino = `%${parametroBusqueda}%`;
            parametros.push(termino, termino, termino);
        }

        if (filtroEstado && ESTADOS_PERMITIDOS.includes(filtroEstado)) {
            clausulaWhere += ' AND c.estado_equipo = ?';
            parametros.push(filtroEstado);
        }

        if (filtroLote) {
            clausulaWhere += ' AND c.id_lote = ?';
            parametros.push(Number(filtroLote));
        }

        const consultaPrincipal = `
            SELECT 
                c.id_celular,
                c.id_lote,
                l.codigo_lote,
                c.numero_imei,
                c.marca,
                c.modelo,
                c.color,
                c.capacidad_almacenamiento,
                c.estado_equipo,
                c.precio_costo,
                c.precio_venta,
                c.fecha_ingreso
            FROM celulares c
            LEFT JOIN lotes l ON c.id_lote = l.id_lote
            ${clausulaWhere}
            ORDER BY c.fecha_ingreso DESC
        `;

        const celulares = await ejecutarConsulta(consultaPrincipal, parametros);

        // Métricas rápidas para tarjetas ejecutivas (KPIs de Luis Baldivieso)
        const consultaMetricas = `
            SELECT 
                COUNT(*) AS total_inventario,
                SUM(CASE WHEN estado_equipo = 'disponible' THEN 1 ELSE 0 END) AS total_disponibles,
                SUM(CASE WHEN estado_equipo = 'en_revision' THEN 1 ELSE 0 END) AS total_en_revision,
                SUM(CASE WHEN estado_equipo = 'en_reparacion' THEN 1 ELSE 0 END) AS total_en_reparacion,
                SUM(CASE WHEN estado_equipo = 'vendido' THEN 1 ELSE 0 END) AS total_vendidos
            FROM celulares
        `;
        const [metricas] = await ejecutarConsulta(consultaMetricas);

        return json({
            exito: true,
            total: celulares.length,
            metricas: metricas || {
                total_inventario: 0,
                total_disponibles: 0,
                total_en_revision: 0,
                total_en_reparacion: 0,
                total_vendidos: 0
            },
            datos: celulares
        });
    } catch (error) {
        console.error('Error en GET /api/inventario_equipos:', error);
        return json(
            {
                exito: false,
                mensaje: 'Error al consultar el inventario de equipos.',
                detalle: error.message
            },
            { status: 500 }
        );
    }
}

/**
 * Registro de un nuevo equipo celular en inventario
 * Aplica RN-003, RN-004 y RN-005 con transacción atómica
 */
export async function POST({ request }) {
    try {
        const cuerpo = await request.json();
        const {
            numero_imei,
            marca,
            modelo,
            color = 'Negro',
            capacidad_almacenamiento = '128GB',
            estado_equipo = 'disponible',
            precio_costo = 0.00,
            precio_venta = 0.00,
            id_lote = null,
            id_usuario_responsable = 1 // Por defecto o usuario en sesión
        } = cuerpo;

        // RN-003: Validación estricta de campos mínimos obligatorios
        if (!numero_imei || !marca || !modelo) {
            return json(
                {
                    exito: false,
                    mensaje: 'Faltan datos obligatorios mínimos: IMEI, marca y modelo son requeridos.'
                },
                { status: 400 }
            );
        }

        // RN-003: Validación de formato de IMEI (15 dígitos numéricos)
        const regexImei = /^[0-9]{15}$/;
        const imeiLimpio = String(numero_imei).trim();
        if (!regexImei.test(imeiLimpio)) {
            return json(
                {
                    exito: false,
                    mensaje: `El IMEI '${imeiLimpio}' es inválido. Debe contener exactamente 15 dígitos numéricos.`
                },
                { status: 400 }
            );
        }

        // RN-003: Validación de estado válido
        if (!ESTADOS_PERMITIDOS.includes(estado_equipo)) {
            return json(
                {
                    exito: false,
                    mensaje: `Estado no permitido. Debe ser uno de: ${ESTADOS_PERMITIDOS.join(', ')}`
                },
                { status: 400 }
            );
        }

        // Verificación de IMEI duplicado
        const [imeiExistente] = await ejecutarConsulta(
            'SELECT id_celular FROM celulares WHERE numero_imei = ? LIMIT 1',
            [imeiLimpio]
        );

        if (imeiExistente) {
            return json(
                {
                    exito: false,
                    mensaje: `El IMEI ${imeiLimpio} ya está registrado en el inventario de Peraphone.`
                },
                { status: 409 }
            );
        }

        // RN-002: Restringir acceso según funciones (Inventario y Administrador)
        const [usuarioResponsable] = await ejecutarConsulta(
            'SELECT u.id_usuario, r.nombre_rol FROM usuarios u INNER JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?',
            [Number(id_usuario_responsable)]
        );

        if (!usuarioResponsable || (usuarioResponsable.nombre_rol !== 'Personal de Inventario' && usuarioResponsable.nombre_rol !== 'Administrador')) {
            return json(
                {
                    exito: false,
                    mensaje: 'Acceso denegado (RN-002): Solo el Personal de Inventario o Administrador puede registrar nuevos celulares en el sistema.'
                },
                { status: 403 }
            );
        }

        // RN-004: Si viene id_lote, verificar que exista
        let loteValido = null;
        if (id_lote && id_lote !== 'null' && id_lote !== '') {
            const [loteEncontrado] = await ejecutarConsulta(
                'SELECT id_lote, codigo_lote FROM lotes WHERE id_lote = ? LIMIT 1',
                [Number(id_lote)]
            );
            if (loteEncontrado) {
                loteValido = loteEncontrado.id_lote;
            }
        }

        // RN-005: Transacción Atómica para inserción en `celulares` y registro en `movimientos`
        const resultadoInsercion = await ejecutarTransaccion(async (conexion) => {
            // 1. Insertar el celular
            const [resultadoCelular] = await conexion.execute(
                `INSERT INTO celulares (
                    id_lote, numero_imei, marca, modelo, color, 
                    capacidad_almacenamiento, estado_equipo, precio_costo, precio_venta
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    loteValido,
                    imeiLimpio,
                    marca.trim(),
                    modelo.trim(),
                    color.trim(),
                    capacidad_almacenamiento.trim(),
                    estado_equipo,
                    Number(precio_costo) || 0.00,
                    Number(precio_venta) || 0.00
                ]
            );

            const nuevoIdCelular = resultadoCelular.insertId;

            // 2. Registrar movimiento de entrada automático e inmutable (RN-005)
            const motivoMovimiento = loteValido 
                ? `RECEPCION_INICIAL_LOTE_${loteValido}` 
                : 'RECEPCION_INDIVIDUAL_DIRECTA';

            await conexion.execute(
                `INSERT INTO movimientos (
                    id_celular, tipo_movimiento, motivo, id_usuario_responsable,
                    ubicacion_origen, ubicacion_destino, es_automatico
                ) VALUES (?, 'ENTRADA', ?, ?, 'Proveedor Externo', 'Almacén Central Peraphone', TRUE)`,
                [
                    nuevoIdCelular,
                    motivoMovimiento,
                    Number(id_usuario_responsable) || 1
                ]
            );

            return {
                id_celular: nuevoIdCelular,
                numero_imei: imeiLimpio
            };
        });

        return json(
            {
                exito: true,
                mensaje: `Equipo ${marca} ${modelo} (IMEI: ${imeiLimpio}) registrado exitosamente con movimiento trazado.`,
                datos: resultadoInsercion
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error en POST /api/inventario_equipos:', error);
        return json(
            {
                exito: false,
                mensaje: 'Error interno al registrar el equipo celular.',
                detalle: error.message
            },
            { status: 500 }
        );
    }
}


export async function PUT({ request }) {
    try {
        const { id_celular, nuevo_estado, id_usuario_responsable } = await request.json();
        if (!id_celular || !nuevo_estado) return json({ exito: false, mensaje: 'Faltan datos.' }, { status: 400 });
        if (!ESTADOS_PERMITIDOS.includes(nuevo_estado)) return json({ exito: false, mensaje: 'Estado inválido.' }, { status: 400 });
        
        const [usuario] = await ejecutarConsulta('SELECT r.nombre_rol FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?', [Number(id_usuario_responsable)]);
        if (!usuario || (usuario.nombre_rol !== 'Administrador' && usuario.nombre_rol !== 'Personal de Inventario')) {
            return json({ exito: false, mensaje: 'Acceso denegado.' }, { status: 403 });
        }

        const [equipoActual] = await ejecutarConsulta('SELECT estado_equipo, numero_imei FROM celulares WHERE id_celular = ?', [Number(id_celular)]);
        if (!equipoActual) return json({ exito: false, mensaje: 'Celular no encontrado.' }, { status: 404 });

        await ejecutarTransaccion(async (conexion) => {
            await conexion.execute('UPDATE celulares SET estado_equipo = ? WHERE id_celular = ?', [nuevo_estado, Number(id_celular)]);
            let motivo = 'CAMBIO_ESTADO_MANUAL';
            let tipoMov = 'AJUSTE';
            let origen = 'Almacén';
            let destino = 'Almacén';
            if (nuevo_estado === 'disponible' && equipoActual.estado_equipo === 'pendiente_recepcion') {
                motivo = 'CONFIRMACION_RECEPCION';
                tipoMov = 'ENTRADA';
                origen = 'Proveedor/Tránsito';
                destino = 'Almacén Central';
            } else if (nuevo_estado === 'en_revision') {
                motivo = 'ENVIO_A_REVISION_TECNICA';
                destino = 'Laboratorio Técnico';
            }
            await conexion.execute(
                `INSERT INTO movimientos (id_celular, tipo_movimiento, motivo, id_usuario_responsable, ubicacion_origen, ubicacion_destino, es_automatico) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
                [Number(id_celular), tipoMov, motivo, Number(id_usuario_responsable), origen, destino]
            );
        });

        return json({ exito: true, mensaje: `Estado actualizado a ${nuevo_estado} exitosamente.` });
    } catch (e) {
        console.error(e);
        return json({ exito: false, mensaje: 'Error interno.', detalle: e.message }, { status: 500 });
    }
}