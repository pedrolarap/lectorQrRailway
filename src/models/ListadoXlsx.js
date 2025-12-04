// models/ListadoXlsx.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const ListadoXlsx = sequelize.define('ListadoXlsx', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // Columnas originales del Excel
  nombreCompleto: {
    type: DataTypes.STRING,
    field: 'nombrecompleto',   // ajusta al nombre real de la columna
  },
  correo: {
    type: DataTypes.STRING,
    field: 'correo',
  },
  organizacion: {
    type: DataTypes.STRING,
    field: 'organizacion',     // o 'organización', según tu tabla
  },
  tipoOrganizacion: {
    type: DataTypes.STRING,
    field: 'tipo_organizacion',
  },
  cargo: {
    type: DataTypes.STRING,
    field: 'cargo',
  },

  // Flags originales del Excel (a qué eventos está inscrito)
  comtelca: {
    type: DataTypes.STRING,
    field: 'comtelca',
  },
  cumbre: {
    type: DataTypes.STRING,
    field: 'cumbre',
  },
  desayuno: {
    type: DataTypes.STRING,
    field: 'desayuno',         // DIGI AMERICAS (DESAYUNO)
  },
  asamblea: {
    type: DataTypes.STRING,
    field: 'asamblea',
  },

  // 🔴 NUEVAS columnas para marcar asistencia real (check-in)
  checkinComtelca: {
    type: DataTypes.BOOLEAN,
    field: 'checkin_comtelca',
    defaultValue: false,
  },
  checkinCumbre: {
    type: DataTypes.BOOLEAN,
    field: 'checkin_cumbre',
    defaultValue: false,
  },
  checkinDesayuno: {
    type: DataTypes.BOOLEAN,
    field: 'checkin_desayuno',
    defaultValue: false,
  },
  checkinAsamblea: {
    type: DataTypes.BOOLEAN,
    field: 'checkin_asamblea',
    defaultValue: false,
  },
  ultimaLecturaQr: {
    type: DataTypes.DATE,
    field: 'ultima_lectura_qr',
    allowNull: true,
  },
}, {
  tableName: 'listado_xlsx',
  timestamps: false,
});

module.exports = ListadoXlsx;
