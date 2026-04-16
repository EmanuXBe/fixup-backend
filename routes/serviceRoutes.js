import express from 'express';
import { getServices, getServiceById, createService } from '../controllers/serviceController.js';
import { getReviewsByService } from '../controllers/reviewController.js';

const router = express.Router();

router.get('/', getServices);
router.get('/:id', getServiceById);
router.post('/', createService);

// GET /api/services/:serviceId/reviews
router.get('/:serviceId/reviews', getReviewsByService);

export default router;
