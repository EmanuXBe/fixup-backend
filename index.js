import express from 'express';
import cors from 'cors';
import sequelize from './database/database.js';
import setRelations from './models/relations.js';
import { loadInitialData } from './initData.js';

import userRoutes from './routes/userRoutes.js';
import servicioRoutes from './routes/servicioRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/users', userRoutes);
app.use('/servicios', servicioRoutes);

// Database Sync and Server Start
const startServer = async () => {
    try {
        // Establecer relaciones
        setRelations();

        // Sincronizar base de datos (force: true para desarrollo inicial)
        await sequelize.sync({ force: true });
        console.log('Base de datos sincronizada.');

        // Carga de datos iniciales
        await loadInitialData();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
    }
};

startServer();
