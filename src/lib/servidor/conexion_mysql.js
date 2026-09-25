/**
 * ==============================================================================
 * MÓDULO DE CONEXIÓN A BASE DE DATOS MYSQL (XAMPP) - PERAPHONE
 * Responsable: Alejandro Paucara | Propietario: Luis Baldivieso
 * ==============================================================================
 * Este archivo gestiona el Pool de conexiones a MySQL utilizando mysql2/promise.
 * Incluye helpers para consultas seguras preparadas y transacciones ACID.
 */

import mysql from 'mysql2/promise';
import { env } from '$env/dynamic/private';

// Configuración de conexión adaptada para XAMPP con variables de entorno o valores por defecto
const configuracionBD = {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PUERTO) || 3306,
    user: env.DB_USUARIO || 'root',
    password: env.DB_CONTRASENA || '',
    database: env.DB_NOMBRE || 'peraphone_db',
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    dateStrings: true
};

// Crear el Pool de conexiones global para alta concurrencia
export const conexionPool = mysql.createPool(configuracionBD);

/**
 * Ejecuta una consulta SQL preparada contra el pool de conexiones.
 * @param {string} sentenciaSql - Consulta SQL con marcadores de posición (?)
 * @param {Array<any>} parametros - Valores seguros para reemplazar los marcadores
 * @returns {Promise<Array<any>>} Filas resultantes de la consulta
 */
export async function ejecutarConsulta(sentenciaSql, parametros = []) {
    try {
        const [filas] = await conexionPool.execute(sentenciaSql, parametros);
        return filas;
    } catch (error) {
        console.error('❌ Error al ejecutar consulta SQL en Peraphone:', error.message);
        throw error;
    }
}

/**
 * Ejecuta una serie de operaciones atómicas dentro de una transacción ACID (BEGIN / COMMIT / ROLLBACK).
 * Garantiza integridad absoluta para ventas, recepciones y devoluciones (RN-005, RN-006, RN-007).
 * @param {function(mysql.PoolConnection): Promise<any>} operacionTransaccional - Función con la lógica transaccional
 * @returns {Promise<any>} Resultado devuelto por la función
 */
export async function ejecutarTransaccion(operacionTransaccional) {
    const conexion = await conexionPool.getConnection();
    try {
        await conexion.beginTransaction();
        const resultado = await operacionTransaccional(conexion);
        await conexion.commit();
        return resultado;
    } catch (error) {
        await conexion.rollback();
        console.error('⚠️ Transacción abortada en Peraphone (Rollback ejecutado):', error.message);
        throw error;
    } finally {
        conexion.release();
    }
}

/**
 * Comprueba el estado de la conexión con el servidor MySQL de XAMPP.
 * @returns {Promise<{conectado: boolean, mensaje: string}>}
 */
export async function verificarConexion() {
    try {
        const conexion = await conexionPool.getConnection();
        conexion.release();
        return {
            conectado: true,
            mensaje: 'Conexión exitosa a MySQL XAMPP (peraphone_db)'
        };
    } catch (error) {
        return {
            conectado: false,
            mensaje: `No se pudo conectar a MySQL en XAMPP. Verifica que Apache y MySQL estén iniciados en el Panel de XAMPP. Detalle: ${error.message}`
        };
    }
}
