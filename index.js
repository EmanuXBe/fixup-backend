import express from 'express';
import cors from 'cors';
import sequelize from './database/database.js';
import setRelations from './models/relations.js';
import { loadInitialData } from './initData.js';

import userRoutes from './routes/userRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reviews', reviewRoutes);

// Database Sync and Server Start
const startServer = async () => {
    try {
        setRelations();

        await sequelize.sync({ force: true });
        console.log('Database synchronized.');

        await loadInitialData();

        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
};

startServer();
