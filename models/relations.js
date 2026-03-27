import User from './User.js';
import Servicio from './Servicio.js';
import Review from './Review.js';

/**
 * Configuración de las relaciones entre los modelos de la base de datos.
 */
const setRelations = () => {
    // Relación: Un Usuario puede tener muchas Reviews (1:N)
    // Se establece userId como clave foránea en la tabla Reviews
    User.hasMany(Review, { foreignKey: 'userId' });
    Review.belongsTo(User, { foreignKey: 'userId' });

    // Relación: Un Servicio puede tener muchas Reviews (1:N)
    // Se establece articleId como clave foránea en la tabla Reviews para referirse al servicio
    Servicio.hasMany(Review, { foreignKey: 'articleId' });
    Review.belongsTo(Servicio, { foreignKey: 'articleId' });
};

export default setRelations;
