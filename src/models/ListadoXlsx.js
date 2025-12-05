// models/ListadoXlsx.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const ListadoXlsx = sequelize.define('ListadoXlsx', {
  correo: { type: DataTypes.STRING, primaryKey: true },
  nombrecompleto: DataTypes.STRING,
  pais: DataTypes.STRING,
  origen: DataTypes.STRING,                 // 👈 NUEVO CAMPO

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
}, {
  tableName: 'listado_xlsx',
  timestamps: false
});

module.exports = ListadoXlsx;
