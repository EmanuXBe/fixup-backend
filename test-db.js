import sequelize from './database/database.js';

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Conexión establecida correctamente.');
        process.exit(0);
    } catch (error) {
        console.error('Error de conexión:', error);
        process.exit(1);
    }
}

test();
