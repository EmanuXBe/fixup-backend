import Review from '../models/Review.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Like from '../models/Like.js';
import { messaging } from '../config/firebase.js';
import { AppError } from '../middlewares/errorMiddleware.js';
import { validateFirebaseUid } from '../middlewares/validationMiddleware.js';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * DTO estandarizado para Review.
 */
const formatReview = (review) => {
    const r = review.get ? review.get({ plain: true }) : (review.toJSON ? review.toJSON() : review);

    return {
        id:      r.id,
        rating:  r.rating,
        comment: r.comment,
        date:    r.date,
        authorName:         r.user?.name          || 'Usuario desconocido',
        authorProfileImage: r.user?.profileImage  || null,
        serviceTitle:       r.service?.title      || 'Servicio eliminado',
        author: {
            name:         r.user?.name         || 'Usuario desconocido',
            profileImage: r.user?.profileImage || null,
        },
        service: {
            title: r.service?.title || 'Servicio eliminado',
        },
    };
};

const resolveRequestUserId = (req) => {
    return req.user?.uid ?? req.body?.userId ?? req.headers['x-user-id'] ?? null;
};

// =============================================================================
// INCLUDES REUTILIZABLES
// =============================================================================

const REVIEW_INCLUDES = [
    {
        model: User,
        as:    'user',
        attributes: ['id', ['username', 'name'], 'profileImage'],
    },
    {
        model: Service,
        as:    'service',
        attributes: ['id', 'title'],
    },
];

// =============================================================================
// ENDPOINTS
// =============================================================================

/**
 * POST /api/reviews
 */
export const createReview = async (req, res, next) => {
    try {
        const { rating, comment, user_id, service_id } = req.body;

        if (rating == null || !user_id || !service_id) {
            throw new AppError('Los campos rating, user_id y service_id son obligatorios', 400, 'MISSING_FIELDS');
        }

        validateFirebaseUid(user_id);

        const newReview = await Review.create({
            rating,
            comment: comment ?? null,
            user_id,
            service_id,
        });

        res.status(201).json({
            status: 'success',
            data: newReview
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/reviews/service/:serviceId
 */
export const getReviewsByService = async (req, res, next) => {
    try {
        const { serviceId } = req.params;

        const reviews = await Review.findAll({
            where:   { service_id: serviceId },
            include: REVIEW_INCLUDES,
        });

        res.json(reviews.map(formatReview));
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/reviews/user/:userId
 */
export const getUserReviews = async (req, res, next) => {
    try {
        const { userId } = req.params;

        validateFirebaseUid(userId);

        const user = await User.findByPk(userId);
        if (!user) {
            throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');
        }

        const reviews = await Review.findAll({
            where:   { user_id: userId },
            include: REVIEW_INCLUDES,
            order:   [['date', 'DESC']],
        });

        res.json(reviews.map(formatReview));
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/reviews/:id/like
 */
export const toggleLike = async (req, res, next) => {
    try {
        const reviewId = parseInt(req.params.id, 10);
        const userId = resolveRequestUserId(req);

        if (!userId) {
            throw new AppError('El campo userId es obligatorio.', 400, 'MISSING_FIELDS');
        }

        validateFirebaseUid(userId);

        const review = await Review.findByPk(reviewId, {
            include: [{ model: User, as: 'user', attributes: ['id', 'username', 'fcmToken'] }],
        });
        if (!review) {
            throw new AppError('Reseña no encontrada.', 404, 'REVIEW_NOT_FOUND');
        }

        const existingLike = await Like.findOne({
            where: { user_id: userId, review_id: reviewId },
        });

        if (existingLike) {
            await existingLike.destroy();
            const likesCount = await Like.count({ where: { review_id: reviewId } });
            return res.json({ status: 'success', liked: false, likesCount });
        }

        await Like.create({ user_id: userId, review_id: reviewId });
        const likesCount = await Like.count({ where: { review_id: reviewId } });

        // Notificación FCM
        const authorFcmToken = review.user?.fcmToken;
        const isOwnReview    = review.user?.id === userId;

        if (authorFcmToken && !isOwnReview) {
            const liker = await User.findByPk(userId, { attributes: ['username'] });
            const likerName = liker?.username || 'Alguien';

            try {
                await messaging.send({
                    token: authorFcmToken,
                    data: {
                        type:       'LIKE_EVENT',
                        reviewId:   String(reviewId),
                        likerName,
                        likesCount: String(likesCount),
                    },
                    android: { priority: 'high' },
                });
            } catch (fcmError) {
                console.error('FCM send error:', fcmError.message);
            }
        }

        return res.json({ status: 'success', liked: true, likesCount });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/reviews/:id
 */
export const updateReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        const requestUserId = resolveRequestUserId(req);
        if (!requestUserId) {
            throw new AppError('Se requiere autenticación.', 401, 'UNAUTHORIZED');
        }

        const review = await Review.findByPk(id);
        if (!review) {
            throw new AppError('Reseña no encontrada.', 404, 'REVIEW_NOT_FOUND');
        }

        if (String(requestUserId) !== String(review.user_id)) {
            throw new AppError('Solo el autor puede modificar esta reseña.', 403, 'FORBIDDEN');
        }

        await review.update({
            rating:  rating  ?? review.rating,
            comment: comment ?? review.comment,
        });

        res.json({ status: 'success', data: review });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/reviews/:id
 */
export const deleteReview = async (req, res, next) => {
    try {
        const { id } = req.params;

        const requestUserId = resolveRequestUserId(req);
        if (!requestUserId) {
            throw new AppError('Se requiere autenticación.', 401, 'UNAUTHORIZED');
        }

        const review = await Review.findByPk(id);
        if (!review) {
            throw new AppError('Reseña no encontrada.', 404, 'REVIEW_NOT_FOUND');
        }

        if (String(requestUserId) !== String(review.user_id)) {
            throw new AppError('Solo el autor puede eliminar esta reseña.', 403, 'FORBIDDEN');
        }

        await review.destroy();
        res.json({ status: 'success', message: `Reseña ${id} eliminada correctamente.` });
    } catch (error) {
        next(error);
    }
};
