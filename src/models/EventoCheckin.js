// models/EventoCheckin.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const EventoCheckin = sequelize.define('EventoCheckin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  correo: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  pais: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  tipo_organizacion: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  evento_principal: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  eventos_marcados: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  evento_escaneado: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  checked_in_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'evento_checkin',
  timestamps: false,
});

module.exports = EventoCheckin;
