import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

/**
 * Modelo de Servicio.
 * Representa los diferentes tipos de remodelaciones disponibles para contratar.
 */
const Servicio = sequelize.define('Servicio', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false, // Nombre del servicio (ej. 'Pintura Interior')
    },
    descripcion: {
        type: DataTypes.TEXT, // Descripción detallada de lo que incluye el servicio
    },
    imagenUrl: {
        type: DataTypes.STRING, // URL de la imagen que representa el servicio
    },
    categoria: {
        type: DataTypes.STRING, // Categoría del servicio (ej. 'Baño', 'Cocina')
    },
}, {
    timestamps: false,
});

export default Servicio;
