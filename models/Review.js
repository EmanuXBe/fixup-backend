import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

/**
 * Modelo de Review.
 * Representa las reseñas hechas por los usuarios sobre los diferentes servicios.
 */
const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    calificacion: {
        type: DataTypes.INTEGER,
        allowNull: false, // La calificación debe ser un entero entre 0 y 5
        validate: {
            min: 0,
            max: 5,
        },
    },
    comentario: {
        type: DataTypes.TEXT, // Comentario opcional sobre el servicio recibido
    },
    fecha: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW, // Fecha en que se creó la reseña
    },
}, {
    timestamps: false,
});

export default Review;
