import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Conexión a PostgreSQL con pool configurado para Render (instancia compartida).
 * max: 5  → límite seguro para el plan gratuito de Render (permite hasta ~97 conexiones,
 *           pero otros procesos comparten el servidor, así que se conserva margen).
 * min: 0  → libera conexiones cuando no hay carga.
 * acquire: 30 000 ms → tiempo máximo esperando una conexión libre antes de lanzar error.
 * idle:   10 000 ms → cierra conexiones inactivas pasados 10 s.
 */
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    logging: false,
});

export default sequelize;
