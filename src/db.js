// db.js
const { Sequelize } = require('sequelize');
require('dotenv').config(); // Cargar variables de entorno

// URL de la base de datos desde las env vars (Railway, Render, etc.)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no está definida en las variables de entorno');
  process.exit(1);
}

// Instancia de Sequelize (MySQL)
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false, // log solo en dev
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production'
      ? {
          require: true,
          rejectUnauthorized: false,
        }
      : undefined,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  retry: {
    max: 3,
    timeout: 60000,
  },
});

// Función para conectar a MySQL
const connectToMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL exitosa (API QR)');

    // IMPORTANTE: en esta API NO sincronizamos automáticamente.
    // Si alguna vez quieres usar sync en desarrollo, descomenta esto:
    /*
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados (development)');
    }
    */
  } catch (error) {
    console.error('❌ Error al conectar a MySQL:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectToMySQL };
