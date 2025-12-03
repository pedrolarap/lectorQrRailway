import mysql from 'mysql2/promise';

function getEnv(name, fallback = undefined) {
  return process.env[name] ?? fallback;
}

// Permite DATABASE_URL (mysql://user:pass@host:port/db) o variables sueltas.
// Intenta también con nombres que Railway expone (MYSQLHOST, etc.).
const configFromUrl = (() => {
  const url = getEnv('DATABASE_URL');
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: u.username,
      password: u.password,
      database: u.pathname.replace(/^\//, '')
    };
  } catch {
    return null;
  }
})();

const pool = mysql.createPool({
  host: configFromUrl?.host     || getEnv('MYSQL_HOST')     || getEnv('MYSQLHOST')     || 'localhost',
  port: configFromUrl?.port     || Number(getEnv('MYSQL_PORT') || getEnv('MYSQLPORT') || 3306),
  user: configFromUrl?.user     || getEnv('MYSQL_USER')     || getEnv('MYSQLUSER')     || 'root',
  password: configFromUrl?.password || getEnv('MYSQL_PASSWORD') || getEnv('MYSQLPASSWORD') || '',
  database: configFromUrl?.database || getEnv('MYSQL_DATABASE') || getEnv('MYSQLDATABASE') || 'qr_eventos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z' // guarda en UTC
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getConnection() {
  return pool.getConnection();
}
