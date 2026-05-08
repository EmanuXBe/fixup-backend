import express from 'express';
import {
    createReview,
    getReviewsByService,
    getUserReviews,
    toggleLike,
    updateReview,
    deleteReview,
} from '../controllers/reviewController.js';
import { validateFirebaseToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * RUTAS PÚBLICAS
 * Cualquiera puede ver las reseñas de un servicio o de un usuario.
 */
router.get('/service/:serviceId', getReviewsByService);
router.get('/user/:userId', getUserReviews);

/**
 * RUTAS PROTEGIDAS
 * Para crear, likear, editar o borrar se requiere un ID Token válido.
 */
router.use(validateFirebaseToken);

router.post('/', createReview);
router.post('/:id/like', toggleLike);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);

export default router;
