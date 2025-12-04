// models/ListadoXlsx.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const ListadoXlsx = sequelize.define(
  'ListadoXlsx',
  {
    // Clave primaria: usamos el correo
    correo: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      field: 'correo',
    },

    nombreCompleto: {
      type: DataTypes.STRING,
      field: 'nombrecompleto',
    },

    organizacion: {
      type: DataTypes.STRING,
      field: 'organizacion',
    },

    tipoOrganizacion: {
      type: DataTypes.STRING,
      field: 'tipo_organizacion',
    },

    cargo: {
      type: DataTypes.STRING,
      field: 'cargo',
    },

    // Flags originales de eventos del Excel
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
      field: 'desayuno',
    },
    asamblea: {
      type: DataTypes.STRING,
      field: 'asamblea',
    },

    // Columnas que agregaste para check-in
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
  },
  {
    tableName: 'listado_xlsx',
    timestamps: false,
  }
);

module.exports = ListadoXlsx;
