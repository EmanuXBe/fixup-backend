import express from 'express';
import { getUsers, getUserById, getReviewsByUserId, createUser, updateFcmToken } from '../controllers/userController.js';

const router = express.Router();

router.get('/', getUsers);
router.post('/', createUser);

// PATCH /api/users/fcm-token — registrado ANTES de /:id para evitar colisión de rutas
router.patch('/fcm-token', updateFcmToken);

router.get('/:id', getUserById);
router.get('/:id/reviews', getReviewsByUserId);

export default router;
