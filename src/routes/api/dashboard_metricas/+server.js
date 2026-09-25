import { json } from '@sveltejs/kit';
import { ejecutarConsulta } from '$lib/servidor/conexion_mysql.js';

export async function GET() {
    try {
        const [kpis] = await ejecutarConsulta(`
            SELECT 
                (SELECT COUNT(*) FROM celulares WHERE estado_equipo = 'disponible') AS stock_disponible,
                (SELECT COUNT(*) FROM celulares WHERE estado_equipo = 'en_revision' OR estado_equipo = 'en_reparacion') AS equipos_taller,
                (SELECT COUNT(*) FROM lotes WHERE estado_lote = 'abierto') AS lotes_abiertos,
                (SELECT COUNT(*) FROM movimientos WHERE DATE(fecha_hora) = CURRENT_DATE()) AS movimientos_hoy
            FROM dual
        `);

        const ultimosMovimientos = await ejecutarConsulta(`
            SELECT 
                m.tipo_movimiento,
                m.motivo,
                m.fecha_hora,
                c.numero_imei,
                c.modelo,
                u.nombre_completo AS responsable
            FROM movimientos m
            INNER JOIN celulares c ON m.id_celular = c.id_celular
            INNER JOIN usuarios u ON m.id_usuario_responsable = u.id_usuario
            ORDER BY m.fecha_hora DESC
            LIMIT 5
        `);

        const ventas7Dias = await ejecutarConsulta(`
            SELECT 
                DATE(fecha_venta) as fecha, 
                SUM(precio_venta_final) as total_ingresos,
                COUNT(id_venta) as cantidad_equipos
            FROM ventas 
            WHERE fecha_venta >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
            GROUP BY DATE(fecha_venta)
            ORDER BY fecha ASC
        `);

        const alertasStock = await ejecutarConsulta(`
            SELECT marca, modelo, COUNT(id_celular) as stock_actual
            FROM celulares
            WHERE estado_equipo = 'disponible'
            GROUP BY marca, modelo
            HAVING stock_actual <= 3
            ORDER BY stock_actual ASC
        `);

        return json({
            exito: true,
            kpis,
            ultimosMovimientos,
            ventas7Dias,
            alertasStock
        });
    } catch (e) {
        return json({ exito: false, mensaje: 'Error al obtener métricas del dashboard.', detalle: e.message }, { status: 500 });
    }
}
