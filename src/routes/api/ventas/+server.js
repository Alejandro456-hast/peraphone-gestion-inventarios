/**
 * Microservicio de Ventas y Descuento de Stock
 * Regla de Negocio RN-006: Descontar stock al vender. Prohibido vender sin stock, salvo pre-ventas.
 * Regla de Negocio RN-002: Exclusivo para Vendedor y Administrador.
 */
import { json } from '@sveltejs/kit';
import { ejecutarConsulta, ejecutarTransaccion } from '$lib/servidor/conexion_mysql.js';

export async function POST({ request }) {
    try {
        const cuerpo = await request.json();
        const {
            id_celular,
            nombre_cliente,
            documento_cliente,
            precio_venta_final,
            es_preventa = false,
            observaciones = '',
            id_usuario_vendedor = 1
        } = cuerpo;

        // 1. RN-002: Verificar que el usuario tenga rol Vendedor o Administrador
        const [usuario] = await ejecutarConsulta(
            'SELECT u.id_usuario, r.nombre_rol FROM usuarios u INNER JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?',
            [Number(id_usuario_vendedor)]
        );

        if (!usuario || (usuario.nombre_rol !== 'Vendedor' && usuario.nombre_rol !== 'Administrador')) {
            return json(
                {
                    exito: false,
                    mensaje: 'Acceso denegado (RN-002): Solo los usuarios con rol Vendedor o Administrador pueden registrar ventas.'
                },
                { status: 403 }
            );
        }

        // Validación de datos mínimos requeridos
        if (!nombre_cliente || !documento_cliente) {
            return json(
                {
                    exito: false,
                    mensaje: 'Debe ingresar el nombre y documento del cliente.'
                },
                { status: 400 }
            );
        }

        // 2. RN-006: Verificar celular y disponibilidad de stock
        let celular = null;
        if (id_celular) {
            const [celularEncontrado] = await ejecutarConsulta(
                'SELECT id_celular, numero_imei, marca, modelo, estado_equipo, precio_venta FROM celulares WHERE id_celular = ? LIMIT 1',
                [Number(id_celular)]
            );
            celular = celularEncontrado;
        }

        // Si no es preventa, el equipo debe existir obligatoriamente y estar disponible
        if (!es_preventa) {
            if (!celular) {
                return json(
                    {
                        exito: false,
                        mensaje: 'Equipo no encontrado para la venta.'
                    },
                    { status: 404 }
                );
            }

            if (celular.estado_equipo !== 'disponible') {
                return json(
                    {
                        exito: false,
                        mensaje: `Prohibido vender (RN-006): El equipo ${celular.marca} ${celular.modelo} (IMEI: ${celular.numero_imei}) no está disponible (Estado actual: '${celular.estado_equipo}').`
                    },
                    { status: 400 }
                );
            }
        }

        // 3. Ejecutar transacción atómica de venta (RN-006 y RN-005)
        await ejecutarTransaccion(async (conexion) => {
            // A. Si no es preventa, cambiar estado a 'vendido'
            if (celular && !es_preventa) {
                await conexion.execute(
                    "UPDATE celulares SET estado_equipo = 'vendido' WHERE id_celular = ?",
                    [celular.id_celular]
                );
            }

            // B. Insertar registro de venta
            const [resultadoVenta] = await conexion.execute(
                `INSERT INTO ventas (
                    id_celular, id_usuario_vendedor, nombre_cliente, 
                    documento_cliente, precio_venta_final, es_preventa, observaciones
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    celular ? celular.id_celular : null,
                    usuario.id_usuario,
                    nombre_cliente.trim(),
                    documento_cliente.trim(),
                    Number(precio_venta_final) || (celular ? Number(celular.precio_venta) : 0),
                    Boolean(es_preventa),
                    observaciones.trim()
                ]
            );

            // C. Si había celular físico, registrar movimiento automático de salida (RN-005)
            if (celular) {
                await conexion.execute(
                    `INSERT INTO movimientos (
                        id_celular, tipo_movimiento, motivo, id_usuario_responsable,
                        ubicacion_origen, ubicacion_destino, es_automatico
                    ) VALUES (?, 'SALIDA', ?, ?, 'Vitrina Peraphone', 'Cliente Final', TRUE)`,
                    [
                        celular.id_celular,
                        `VENTA_ORDEN_${resultadoVenta.insertId} a ${nombre_cliente.trim()} (Doc: ${documento_cliente.trim()})`,
                        usuario.id_usuario
                    ]
                );
            }
        });

        return json({
            exito: true,
            mensaje: `Venta registrada con éxito. Stock descontado para ${celular ? celular.marca + ' ' + celular.modelo : 'Pre-venta'}.`
        });
    } catch (error) {
        console.error('Error en POST /api/ventas:', error);
        return json(
            {
                exito: false,
                mensaje: 'Error interno al registrar la venta.',
                detalle: error.message
            },
            { status: 500 }
        );
    }
}
