import User from '../models/User.js';
import Review from '../models/Review.js';
import Service from '../models/Service.js';
import { AppError } from '../middlewares/errorMiddleware.js';
import { validateFirebaseUid } from '../middlewares/validationMiddleware.js';

/**
 * =============================================================================
 * Controlador de Usuarios (User Controller)
 * =============================================================================
 *
 * RESPONSABILIDAD:
 * Maneja las operaciones de lectura y sincronización sobre la entidad User.
 *
 * @see models/User.js — Modelo con PK tipo STRING (Firebase UID)
 */

/**
 * GET /api/users — Obtener la lista completa de usuarios
 */
export const getUsers = async (req, res, next) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/:id — Obtener un usuario por su Firebase UID
 */
export const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;

        validateFirebaseUid(id);

        const user = await User.findByPk(id);
        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/:id/reviews — Obtener reseñas de un usuario específico
 */
export const getReviewsByUserId = async (req, res, next) => {
    try {
        const { id } = req.params;

        validateFirebaseUid(id);

        const user = await User.findByPk(id);
        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        const reviews = await Review.findAll({
            where: { user_id: id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', ['username', 'name'], 'profileImage'],
                },
                {
                    model: Service,
                    attributes: ['id', 'title', 'categoria'],
                },
            ],
            order: [['date', 'DESC']],
        });

        const formattedReviews = reviews.map((review) => {
            const r = review.toJSON();
            return {
                id:      r.id,
                rating:  r.rating,
                comment: r.comment,
                date:    r.date,
                authorName:            r.user?.name          ?? null,
                authorProfileImageUrl: r.user?.profileImage  ?? null,
                user: r.user
                    ? {
                        id:           r.user.id,
                        name:         r.user.name,
                        profileImage: r.user.profileImage ?? null,
                    }
                    : null,
                service: r.Service
                    ? { id: r.Service.id, title: r.Service.title, categoria: r.Service.categoria }
                    : null,
            };
        });

        res.json({
            user: {
                id: user.id,
                name: user.username,
                email: user.email,
                profileImage: user.profileImage || null,
            },
            reviews: formattedReviews,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/users — Sincronizar usuario recién creado de Firebase a PostgreSQL
 */
export const createUser = async (req, res, next) => {
    try {
        const { id, email, name, profileImage } = req.body;

        validateFirebaseUid(id);

        if (!email || !name) {
            throw new AppError('El correo electrónico (email) y el nombre (name) son requeridos.', 400, 'MISSING_FIELDS');
        }

        const existingUser = await User.findByPk(id);
        if (existingUser) {
            return res.status(200).json({
                status: 'success',
                message: 'El perfil de usuario ya está sincronizado.',
                user: existingUser
            });
        }

        const newUser = await User.create({
            id,
            email,
            username: name,
            profileImage: profileImage || null
        });

        return res.status(201).json({
            status: 'success',
            message: 'El registro inicial se completó correctamente.',
            user: newUser
        });

    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/users/fcm-token — Registrar o actualizar el token FCM del usuario
 */
export const updateFcmToken = async (req, res, next) => {
    try {
        const { userId, fcmToken } = req.body;

        if (!userId || !fcmToken) {
            throw new AppError('Los campos userId y fcmToken son obligatorios.', 400, 'MISSING_FIELDS');
        }

        validateFirebaseUid(userId);

        const user = await User.findByPk(userId);
        if (!user) {
            throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');
        }

        await user.update({ fcmToken });

        return res.json({ 
            status: 'success',
            message: 'Token FCM actualizado correctamente.' 
        });
    } catch (error) {
        next(error);
    }
};
