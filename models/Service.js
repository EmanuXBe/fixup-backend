import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

/**
 * Service Model.
 * Represents the different types of renovation services available for hire.
 */
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
});

export default Service;
