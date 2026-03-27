import User from './User.js';
import Servicio from './Servicio.js';
import Review from './Review.js';

const setRelations = () => {
    // Un Usuario tiene muchas Reviews
    User.hasMany(Review, { foreignKey: 'userId' });
    Review.belongsTo(User, { foreignKey: 'userId' });

    // Un Servicio tiene muchas Reviews (el requisito pide usar articleId como FK para el Servicio)
    Servicio.hasMany(Review, { foreignKey: 'articleId' });
    Review.belongsTo(Servicio, { foreignKey: 'articleId' });
};

export default setRelations;
