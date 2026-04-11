import express from 'express';
import { getUsers, getUserById, getReviewsByUserId } from '../controllers/userController.js';

const router = express.Router();

router.get('/', getUsers);
router.get('/:id', getUserById);
router.get('/:id/reviews', getReviewsByUserId);

export default router;
