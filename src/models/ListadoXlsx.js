// models/ListadoXlsx.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const ListadoXlsx = sequelize.define(
  'ListadoXlsx',
  {
    // Usamos 'correo' como clave primaria (no hay columna id)
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

    // OJO: aquí va el nombre correcto 'tipo_de_organizacion'
    tipoOrganizacion: {
      type: DataTypes.STRING,
      field: 'tipo_de_organizacion',
    },

    cargo: {
      type: DataTypes.STRING,
      field: 'cargo',
    },

    // Flags de inscripción a eventos
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
      field: 'desayuno', // DIGI AMERICAS (DESAYUNO)
    },
    asamblea: {
      type: DataTypes.STRING,
      field: 'asamblea',
    },

    // Texto largo de eventos y tipo de participación
    evento: {
      type: DataTypes.TEXT,
      field: 'evento',
    },
    participacion: {
      type: DataTypes.STRING,
      field: 'participacion',
    },

    // Columnas para check-in (las que agregamos)
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
