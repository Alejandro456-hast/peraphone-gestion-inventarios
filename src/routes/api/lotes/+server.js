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
