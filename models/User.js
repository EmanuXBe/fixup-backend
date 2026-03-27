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
    username: {
        type: DataTypes.STRING,
        allowNull: false, // El nombre de usuario es obligatorio
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Cada correo debe ser único
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false, // La contraseña es obligatoria
    },
}, {
    timestamps: false, // Desactiva createdAt y updatedAt
});

export default User;
