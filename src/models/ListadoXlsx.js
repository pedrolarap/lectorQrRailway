// models/ListadoXlsx.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const ListadoXlsx = sequelize.define('ListadoXlsx', {
  correo: { type: DataTypes.STRING, primaryKey: true },
  nombrecompleto: DataTypes.STRING,
  pais: DataTypes.STRING,

  // 👇 ya lo tenías
  origen: DataTypes.STRING,

  organizacion: DataTypes.STRING,
  tipo_de_organizacion: DataTypes.STRING,
  cargo: DataTypes.STRING,

  comtelca: DataTypes.STRING,
  cumbre: DataTypes.STRING,
  desayuno: DataTypes.STRING,
  asamblea: DataTypes.STRING,

  participacion: DataTypes.STRING,
  evento: DataTypes.STRING,

  checkin_comtelca: DataTypes.TINYINT,
  checkin_cumbre: DataTypes.TINYINT,
  checkin_desayuno: DataTypes.TINYINT,
  checkin_asamblea: DataTypes.TINYINT,
  ultima_lectura_qr: DataTypes.DATE,

  // 👇 NUEVO CAMPO PARA GUARDAR EL JSON/TEXTO DEL QR
  qr_payload: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'listado_xlsx',
  timestamps: false,
});

module.exports = ListadoXlsx;
