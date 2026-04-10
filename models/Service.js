import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

const Service = sequelize.define('Service', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    image_url: {
        type: DataTypes.STRING,
        field: 'image_url',
    },
    categoria: {
        type: DataTypes.STRING,
    },
}, {
    timestamps: false,
    tableName: 'Services',
    indexes: [
        // Acelera filtros por categoría en el feed principal
        { fields: ['categoria'] },
    ],
});

export default Service;
