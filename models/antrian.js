'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Antrian extends Model {
    static associate(models) {
    }
  }
  Antrian.init({
    code: DataTypes.STRING,
    instansi_id: DataTypes.INTEGER,
    layanan_id: DataTypes.INTEGER,
    userinfo_id: DataTypes.INTEGER,
    status: DataTypes.BOOLEAN,
    qrcode: DataTypes.STRING,
    audio: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Antrian',
  });
  return Antrian;
};