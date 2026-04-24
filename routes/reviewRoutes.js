import express from 'express';
import {
    createReview,
    getReviewsByService,
    getUserReviews,
    toggleLike,
    updateReview,
    deleteReview,
} from '../controllers/reviewController.js';

const router = express.Router();

// POST   /api/reviews
router.post('/', createReview);

// GET    /api/reviews/service/:serviceId
router.get('/service/:serviceId', getReviewsByService);

// GET    /api/reviews/user/:userId
router.get('/user/:userId', getUserReviews);

// POST   /api/reviews/:id/like   — toggle like (crear o eliminar)
router.post('/:id/like', toggleLike);

// PUT    /api/reviews/:id
router.put('/:id', updateReview);

// DELETE /api/reviews/:id
router.delete('/:id', deleteReview);

export default router;
