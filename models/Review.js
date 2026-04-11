import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

/**
 * Review Model.
 * Represents user reviews on services.
 */
const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    rating: {
        type: DataTypes.INTEGER,
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
});

export default Review;
