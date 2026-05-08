import express from 'express';
import { getUsers, getUserById, getReviewsByUserId, createUser, updateFcmToken } from '../controllers/userController.js';
import { validateFirebaseToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas públicas (para sincronización inicial si es necesario, o visualización de perfiles)
router.get('/', getUsers);
router.post('/', createUser); // El cliente llama a esto después del registro en Firebase

// Rutas protegidas
router.use(validateFirebaseToken);

// PATCH /api/users/fcm-token
router.patch('/fcm-token', updateFcmToken);

router.get('/:id', getUserById);
router.get('/:id/reviews', getReviewsByUserId);

export default router;
