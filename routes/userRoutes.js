import express from 'express';
import { getUsers, getUserById, getReviewsByUserId, createUser } from '../controllers/userController.js';

const router = express.Router();

router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.get('/:id/reviews', getReviewsByUserId);

export default router;
