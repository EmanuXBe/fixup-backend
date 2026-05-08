import express from 'express';
import {
    createProperty,
    getProperties,
    getPropertiesByUser,
} from '../controllers/propertyController.js';
import { validateFirebaseToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * RUTAS PÚBLICAS
 */
router.get('/', getProperties);
router.get('/user/:userId', getPropertiesByUser);

/**
 * RUTAS PROTEGIDAS
 */
router.post('/', validateFirebaseToken, createProperty);

export default router;
