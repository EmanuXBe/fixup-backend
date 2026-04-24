import Review from '../models/Review.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Like from '../models/Like.js';
import { messaging } from '../config/firebase.js';

// =============================================================================
// HELPERS
// =============================================================================

const isValidFirebaseUid = (uid) => {
    if (typeof uid !== 'string') return false;
    if (uid.length < 20 || uid.length > 128) return false;
    return /^[a-zA-Z0-9]+$/.test(uid);
};

/**
 * DTO estandarizado para Review.
 *
 * Incluye tanto campos planos (authorName, serviceTitle, authorProfileImage)
 * para compatibilidad con el DTO de Android, como los objetos anidados
 * (author, service) para flexibilidad del cliente.
 *
 * @param {Review} review — Instancia Sequelize con includes de User y Service
 */
const formatReview = (review) => {
    const r = review.get ? review.get({ plain: true }) : (review.toJSON ? review.toJSON() : review);

    return {
        id:      r.id,
        rating:  r.rating,
        comment: r.comment,
        date:    r.date,
        // Campos planos — contratos Android (FixUpMessagingService, ReviewAdapter)
        authorName:         r.user?.name          || 'Usuario desconocido',
        authorProfileImage: r.user?.profileImage  || null,
        serviceTitle:       r.service?.title      || 'Servicio eliminado',
        // Objetos anidados — para clientes que prefieren estructura jerárquica
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
    return req.body?.userId ?? req.headers['x-user-id'] ?? null;
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
 * Crea una nueva reseña.
 */
export const createReview = async (req, res) => {
    try {
        const { rating, comment, user_id, service_id } = req.body;

        if (rating == null || !user_id || !service_id) {
            return res.status(400).json({
                message: 'Los campos rating, user_id y service_id son obligatorios',
            });
        }

        if (!isValidFirebaseUid(user_id)) {
            return res.status(400).json({
                message: 'El user_id no es un UID de Firebase válido (alfanumérico, 20-128 chars).',
            });
        }

        const newReview = await Review.create({
            rating,
            comment: comment ?? null,
            user_id,
            service_id,
        });

        res.status(201).json(newReview);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/reviews/service/:serviceId
 * Devuelve todas las reseñas de un servicio con datos del autor.
 */
export const getReviewsByService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const reviews = await Review.findAll({
            where:   { service_id: serviceId },
            include: REVIEW_INCLUDES,
        });

        res.json(reviews.map(formatReview));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/reviews/user/:userId
 * Devuelve todas las reseñas escritas por un usuario (Mis Reseñas).
 */
export const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidFirebaseUid(userId)) {
            return res.status(400).json({
                message: 'El userId no es un UID de Firebase válido (alfanumérico, 20-128 chars).',
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const reviews = await Review.findAll({
            where:   { user_id: userId },
            include: REVIEW_INCLUDES,
            order:   [['date', 'DESC']],
        });

        res.json(reviews.map(formatReview));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/reviews/:id/like
 * Toggle de like: si ya existe lo elimina, si no existe lo crea.
 *
 * Cuando se CREA un like, envía una notificación FCM al autor de la reseña
 * con type: "LIKE_EVENT" (contrato definido en FixUpMessagingService de Android).
 *
 * Body: { userId: string (Firebase UID del usuario que da/quita el like) }
 * Respuesta: { liked: boolean, likesCount: number }
 */
export const toggleLike = async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id, 10);
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'El campo userId es obligatorio.' });
        }

        if (!isValidFirebaseUid(userId)) {
            return res.status(400).json({
                message: 'El userId no es un UID de Firebase válido (alfanumérico, 20-128 chars).',
            });
        }

        // Verificar que la reseña existe (con el autor para obtener fcmToken)
        const review = await Review.findByPk(reviewId, {
            include: [{ model: User, as: 'user', attributes: ['id', 'username', 'fcmToken'] }],
        });
        if (!review) {
            return res.status(404).json({ message: 'Reseña no encontrada.' });
        }

        // Buscar el like existente
        const existingLike = await Like.findOne({
            where: { user_id: userId, review_id: reviewId },
        });

        if (existingLike) {
            // Ya dio like → quitar like (toggle OFF)
            await existingLike.destroy();
            const likesCount = await Like.count({ where: { review_id: reviewId } });
            return res.json({ liked: false, likesCount });
        }

        // No había like → crear like (toggle ON)
        await Like.create({ user_id: userId, review_id: reviewId });
        const likesCount = await Like.count({ where: { review_id: reviewId } });

        // Enviar notificación FCM al autor de la reseña (si tiene token y no es el mismo usuario)
        const authorFcmToken = review.user?.fcmToken;
        const isOwnReview    = review.user?.id === userId;

        if (authorFcmToken && !isOwnReview) {
            // Obtener nombre del usuario que dio like para el mensaje
            const liker = await User.findByPk(userId, { attributes: ['username'] });
            const likerName = liker?.username || 'Alguien';

            try {
                await messaging.send({
                    token: authorFcmToken,
                    // data payload: todos los valores deben ser strings
                    data: {
                        type:       'LIKE_EVENT',
                        reviewId:   String(reviewId),
                        likerName,
                        likesCount: String(likesCount),
                    },
                    android: { priority: 'high' },
                });
            } catch (fcmError) {
                // FCM falla silenciosamente: el like ya fue creado, no revertir la operación
                console.error('FCM send error:', fcmError.message);
            }
        }

        return res.json({ liked: true, likesCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * PUT /api/reviews/:id
 * Actualiza rating y/o comentario. Solo el autor puede modificar su reseña.
 */
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        const requestUserId = resolveRequestUserId(req);
        if (!requestUserId) {
            return res.status(401).json({
                message: 'Se requiere userId (body "userId" o header "x-user-id").',
            });
        }

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Reseña no encontrada.' });
        }

        if (String(requestUserId) !== String(review.user_id)) {
            return res.status(403).json({
                message: 'Solo el autor puede modificar esta reseña.',
            });
        }

        await review.update({
            rating:  rating  ?? review.rating,
            comment: comment ?? review.comment,
        });

        res.json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * DELETE /api/reviews/:id
 * Elimina la reseña y sus likes asociados (cascade DB-level).
 * Solo el autor puede eliminar su reseña.
 */
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        const requestUserId = resolveRequestUserId(req);
        if (!requestUserId) {
            return res.status(401).json({
                message: 'Se requiere userId (body "userId" o header "x-user-id").',
            });
        }

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Reseña no encontrada.' });
        }

        if (String(requestUserId) !== String(review.user_id)) {
            return res.status(403).json({
                message: 'Solo el autor puede eliminar esta reseña.',
            });
        }

        // Los likes se eliminan por CASCADE en la FK review_id de la tabla Likes
        await review.destroy();
        res.json({ message: `Reseña ${id} eliminada correctamente.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
