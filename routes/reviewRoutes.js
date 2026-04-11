import express from 'express';
import {
    createReview,
    getReviewsByService,
    getUserReviews,
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

// PUT    /api/reviews/:id
router.put('/:id', updateReview);

// DELETE /api/reviews/:id
router.delete('/:id', deleteReview);

export default router;
