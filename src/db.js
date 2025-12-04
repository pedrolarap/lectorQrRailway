import mysql from 'mysql2/promise';

/**
 * Obtiene una variable de entorno, usando un valor de fallback si no existe.
 * @param {string} name - Nombre de la variable de entorno.
 * @param {any} [fallback=undefined] - Valor predeterminado si no se encuentra.
 * @returns {any} El valor de la variable de entorno o el fallback.
 */
function getEnv(name, fallback = undefined) {
  // Utilizamos el operador ?? (nullish coalescing) para manejar null o undefined,
  // pero aseguramos que sea una cadena si es undefined.
  return process.env[name] ?? fallback;
}

/**
 * Intenta construir la configuración de la BD a partir de DATABASE_URL.
 * Si no se encuentra, devuelve null.
 */
const configFromUrl = (() => {
  const url = getEnv('DATABASE_URL');
  if (!url) return null;
  try {
    const u = new URL(url);
    // Verificar si el protocolo es mysql o similar
    if (!u.protocol.startsWith('mysql')) {
      return null;
    }
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: u.username,
      password: u.password,
      database: u.pathname.replace(/^\//, '')
    };
  } catch (e) {
    console.error("Error parsing DATABASE_URL:", e.message);
    return null;
  }
})();

// Creación del Pool de Conexiones
const pool = mysql.createPool({
  host: configFromUrl?.host      || getEnv('MYSQL_HOST')    || getEnv('MYSQLHOST')    || 'localhost',
  port: configFromUrl?.port      || Number(getEnv('MYSQL_PORT') || getEnv('MYSQLPORT') || 3306),
  user: configFromUrl?.user      || getEnv('MYSQL_USER')    || getEnv('MYSQLUSER')    || 'root',
  password: configFromUrl?.password || getEnv('MYSQL_PASSWORD') || getEnv('MYSQLPASSWORD') || '',
  database: configFromUrl?.database || getEnv('MYSQL_DATABASE') || getEnv('MYSQLDATABASE') || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z' // Guarda todas las fechas/horas en UTC
});

/**
 * Ejecuta una consulta SQL en el pool y devuelve solo las filas.
 * Ideal para consultas que no requieren transacciones (SELECT, INSERT/UPDATE simples).
 *
 * @param {string} sql - La consulta SQL con placeholders (?).
 * @param {Array<any>} [params=[]] - Los parámetros para los placeholders.
 * @returns {Promise<Array<any>>} Las filas resultantes de la consulta.
 */
export async function query(sql, params = []) {
  // pool.execute garantiza la seguridad contra inyección SQL.
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Adquiere una conexión individual del pool.
 * Necesario para operaciones que requieren transacciones (BEGIN, COMMIT, ROLLBACK).
 *
 * @returns {Promise<mysql.PoolConnection>} Una conexión de base de datos.
 */
export async function getConnection() {
  return pool.getConnection();
}