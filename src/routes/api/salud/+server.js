/**
 * Microservicio de Diagnóstico y Salud del Sistema
 * Verifica la disponibilidad del servidor MySQL en XAMPP.
 */
import { json } from '@sveltejs/kit';
import { verificarConexion } from '$lib/servidor/conexion_mysql.js';

export async function GET() {
    const estadoConexion = await verificarConexion();
    if (!estadoConexion.conectado) {
        return json(
            {
                estado: 'error',
                mensaje: estadoConexion.mensaje,
                servicios: {
                    servidor_web: 'activo',
                    base_de_datos: 'inactivo'
                }
            },
            { status: 503 }
        );
    }

    return json({
        estado: 'ok',
        mensaje: estadoConexion.mensaje,
        servicios: {
            servidor_web: 'activo',
            base_de_datos: 'conectado'
        }
    });
}
