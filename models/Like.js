import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

/**
 * Tabla de unión para la relación M:N entre User y Review.
 * Cada fila representa un "like" de un usuario a una reseña.
 * La PK compuesta (user_id + review_id) garantiza un único like por par.
 */
const Like = sequelize.define('Like', {
    user_id: {
        type: DataTypes.STRING(128),
        allowNull: false,
        primaryKey: true,
    },
    review_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
}, {
    timestamps: false,
    tableName: 'Likes',
});

export default Like;
