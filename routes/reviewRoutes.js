import express from 'express';
import {
    createReview,
    getReviewsByServicio,
    getReviewsByUser,
    updateReview,
    deleteReview,
} from '../controllers/reviewController.js';

const router = express.Router();

// POST   /api/reviews                          → Crear review
router.post('/', createReview);

// GET    /api/reviews/servicio/:servicioId     → Reviews de un servicio
router.get('/servicio/:servicioId', getReviewsByServicio);

// GET    /api/reviews/user/:userId             → Reviews de un usuario
router.get('/user/:userId', getReviewsByUser);

// PUT    /api/reviews/:id                      → Actualizar review
router.put('/:id', updateReview);

// DELETE /api/reviews/:id                      → Eliminar review
router.delete('/:id', deleteReview);

export default router;
