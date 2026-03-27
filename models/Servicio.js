import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

const Servicio = sequelize.define('Servicio', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    descripcion: {
        type: DataTypes.TEXT,
    },
    imagenUrl: {
        type: DataTypes.STRING,
    },
    categoria: {
        type: DataTypes.STRING,
    },
}, {
    timestamps: false,
});

export default Servicio;
