// models/EventoParticipacion.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const EventoParticipacion = sequelize.define('EventoParticipacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  correo: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  pais: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  tipo_organizacion: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  evento_principal: {           // "Evento a participar"
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  eventos_marcados: {           // "Participa en: COMTELCA, CUMBRE..."
    type: DataTypes.TEXT,
    allowNull: true,
  },
  evento_escaneado: {           // evento donde está el lector (COMTELCA, etc.)
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  checked_in_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'evento_participacion',
  timestamps: false,
});

module.exports = EventoParticipacion;
