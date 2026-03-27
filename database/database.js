import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Configura las variables de entorno
dotenv.config();

/**
 * Configuración de la conexión a la base de datos PostgreSQL usando Sequelize.
 * Optimizado para despliegue en la nube (ej. Neon/Render) usando SSL.
 */
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false // Desactiva los logs de SQL en la consola para una salida más limpia
});

export default sequelize;
