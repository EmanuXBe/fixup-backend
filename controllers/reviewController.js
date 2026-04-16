import Review from '../models/Review.js';
import User from '../models/User.js';
import Service from '../models/Service.js';

/** Transforms a Sequelize Review instance into the standardized response shape. */
const formatReview = (review) => {
    const r = review.toJSON();
    return {
        id:      r.id,
        rating:  r.rating,
        comment: r.comment,
        date:    r.date,
        author: r.User
            ? { id: r.User.id, name: r.User.username, email: r.User.email }
            : null,
        service: r.Service
            ? { id: r.Service.id, title: r.Service.title, categoria: r.Service.categoria }
            : null,
    };
};

/** Reads the caller's userId from body first, then from the x-user-id header. */
const resolveRequestUserId = (req) => {
    const fromBody   = req.body?.userId;
    const fromHeader = req.headers['x-user-id'];
    const raw = fromBody ?? fromHeader;
    return raw != null ? Number(raw) : null;
};

/**
 * POST /api/reviews — Create a new review.
 * Body: { rating, comment, user_id, service_id }
 */
export const createReview = async (req, res) => {
    try {
        const { rating, comment, user_id, service_id } = req.body;

        if (rating == null || !user_id || !service_id) {
            return res.status(400).json({
                message: 'Fields rating, user_id and service_id are required',
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
 * GET /api/reviews/service/:serviceId  (also served from /api/services/:serviceId/reviews)
 * Returns all reviews for a service, each with nested author and service info.
 */
export const getReviewsByService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const reviews = await Review.findAll({
            where: { service_id: serviceId },
            include: [
                { model: User,    attributes: ['id', 'username', 'email'] },
                { model: Service, attributes: ['id', 'title', 'categoria'] },
            ],
        });

        res.json(reviews.map(formatReview));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/reviews/user/:userId
 * Returns all reviews written by a user, each with nested author and service info.
 */
export const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;

        const reviews = await Review.findAll({
            where: { user_id: userId },
            include: [
                { model: User,    attributes: ['id', 'username', 'email'] },
                { model: Service, attributes: ['id', 'title', 'categoria'] },
            ],
        });

        res.json(reviews.map(formatReview));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * PUT /api/reviews/:id — Update a review by ID.
 * Body: { userId, rating?, comment? }
 * Headers (alternative): x-user-id
 * Security: only the review owner may update.
 */
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        const requestUserId = resolveRequestUserId(req);
        if (!requestUserId) {
            return res.status(401).json({ message: 'Se requiere userId para esta operación' });
        }

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review no encontrado' });
        }

        if (requestUserId !== review.user_id) {
            return res.status(403).json({
                message: 'No tienes permiso para modificar este review',
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
 * DELETE /api/reviews/:id — Delete a review by ID.
 * Body: { userId }
 * Headers (alternative): x-user-id
 * Security: only the review owner may delete.
 */
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        const requestUserId = resolveRequestUserId(req);
        if (!requestUserId) {
            return res.status(401).json({ message: 'Se requiere userId para esta operación' });
        }

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review no encontrado' });
        }

        if (requestUserId !== review.user_id) {
            return res.status(403).json({
                message: 'No tienes permiso para modificar este review',
            });
        }

        await review.destroy();
        res.json({ message: `Review ${id} eliminado correctamente` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
