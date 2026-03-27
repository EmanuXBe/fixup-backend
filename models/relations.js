import User from './User.js';
import Service from './Service.js';
import Review from './Review.js';

/**
 * Sets up associations between models.
 */
const setRelations = () => {
    // User 1:N Reviews
    User.hasMany(Review, { foreignKey: 'user_id' });
    Review.belongsTo(User, { foreignKey: 'user_id' });

    // Service 1:N Reviews
    Service.hasMany(Review, { foreignKey: 'service_id' });
    Review.belongsTo(Service, { foreignKey: 'service_id' });
};

export default setRelations;
