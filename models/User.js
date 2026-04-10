import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

/**
 * Modelo de Usuario.
 * Representa a los clientes y administradores de la plataforma.
 */
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, // ID autoincremental
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    photo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    timestamps: false, // Desactiva createdAt y updatedAt
});

export default User;
