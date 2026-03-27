import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Configura las variables de entorno desde el archivo .env
dotenv.config();

/**
 * Configuración de la conexión a la base de datos PostgreSQL usando Sequelize.
 * Se utilizan variables de entorno para mayor seguridad y flexibilidad.
 */
const sequelize = new Sequelize(
    process.env.DB_NAME || 'fixup_db',     // Nombre de la base de datos
    process.env.DB_USER || 'postgres',     // Usuario de la base de datos
    process.env.DB_PASSWORD || 'password', // Contraseña del usuario
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',               // Motor de base de datos
        logging: false,                    // Desactiva los logs de SQL en la consola para una salida más limpia
    }
);

export default sequelize;
