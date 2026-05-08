import express from 'express';
import { getServices, getServiceById, createService } from '../controllers/serviceController.js';
import { getReviewsByService } from '../controllers/reviewController.js';
import { validateFirebaseToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas públicas
router.get('/', getServices);
router.get('/:id', getServiceById);
router.get('/:serviceId/reviews', getReviewsByService);

// Rutas protegidas (solo para creación de servicios, si aplica)
router.post('/', validateFirebaseToken, createService);

export default router;
