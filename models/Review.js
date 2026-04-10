import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    // FLOAT garantiza que Android lo reciba como Double, evitando ClassCastException
    rating: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0,
            max: 5,
        },
    },
    comment: {
        type: DataTypes.TEXT,
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    timestamps: false,
    indexes: [
        // Acelera GET /reviews/service/:serviceId
        { fields: ['service_id'] },
        // Acelera GET /reviews/user/:userId
        { fields: ['user_id'] },
    ],
});

export default Review;
