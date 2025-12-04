// server.js
const express = require('express');
const cors = require('cors');

const { sequelize, connectToMySQL } = require('./db');

// Rutas

const eventosRoutes = require('./routes/eventos');
const usuariosRoutes = require('./routes/usuarios');

const app = express();

// ====== Middlewares base ======
app.use(cors());
app.use(express.json());

// Logging simple
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ====== Rutas de la API ======
app.use('/api/eventos', eventosRoutes);
app.use('/api/usuarios', usuariosRoutes);



// ====== Endpoint de salud ======
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ====== Ruta raíz ======
app.get('/', (req, res) => {
  res.json({
    message: 'API de Registro y Check-in por QR',
    version: '1.0.0',
    endpoints: {
      checkin: '/api/eventos/checkin',
      health: '/health'
    }
  });
});

// ====== Manejo de errores global ======
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// ====== 404 ======
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ====== Inicio del servidor ======
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Conectar a MySQL
    await connectToMySQL();
    console.log('✅ Conexión a MySQL exitosa');

    // (Opcional) listar tablas existentes
    try {
      const [tables] = await sequelize.query('SHOW TABLES');
      console.log('📊 Tablas existentes:', tables.map(t => Object.values(t)[0]));
    } catch {
      console.log('ℹ️ No se pudieron listar las tablas (puede ser normal)');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
};

// ====== Cierre graceful ======
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor...');
  try {
    await sequelize.close();
    console.log('✅ Conexión a la base de datos cerrada');
  } catch (error) {
    console.error('❌ Error cerrando conexión:', error);
  }
  process.exit(0);
});

startServer();
