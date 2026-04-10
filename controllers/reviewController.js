import Review from '../models/Review.js';
import User from '../models/User.js';
import Service from '../models/Service.js';

// ─── DTOs ────────────────────────────────────────────────────────────────────

const toReviewDTO = (review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment ?? null,
    date: review.date,
    user_id: review.user_id,
    service_id: review.service_id,
});

const toReviewWithAuthorDTO = (review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment ?? null,
    date: review.date,
    service_id: review.service_id,
    author: review.User
        ? { id: review.User.id, name: review.User.name, photo: review.User.photo ?? null }
        : null,
});

const toReviewWithServiceDTO = (review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment ?? null,
    date: review.date,
    user_id: review.user_id,
    service: review.Service
        ? { id: review.Service.id, title: review.Service.title }
        : null,
});

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/reviews — Crea un nuevo review.
 * Body: { rating, comment, user_id, service_id }
 */
export const createReview = async (req, res) => {
    try {
        const { rating, comment, user_id, service_id } = req.body;

        if (rating == null || !user_id || !service_id) {
            return res.status(400).json({
                message: 'Los campos rating, user_id y service_id son obligatorios',
            });
        }

        const newReview = await Review.create({
            rating,
            comment: comment ?? null,
            user_id,
            service_id,
        });

        res.status(201).json(toReviewDTO(newReview));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/reviews/service/:serviceId — Comentarios de un artículo con datos del autor.
 */
export const getReviewsByService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const reviews = await Review.findAll({
            where: { service_id: serviceId },
            include: [{ model: User, attributes: ['id', 'name', 'photo'] }],
        });

        res.json(reviews.map(toReviewWithAuthorDTO));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/reviews/user/:userId — Mis comentarios con datos del artículo comentado.
 */
export const getReviewsByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const reviews = await Review.findAll({
            where: { user_id: userId },
            include: [{ model: Service, attributes: ['id', 'title'] }],
        });

        res.json(reviews.map(toReviewWithServiceDTO));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * PUT /api/reviews/:id — Actualiza rating o comment de un review.
 * Body: { rating?, comment?, userId }  — userId simulado mientras no hay auth real.
 */
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment, userId } = req.body;

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review no encontrado' });
        }

        if (review.user_id !== userId) {
            return res.status(403).json({ message: 'No tienes permisos para modificar este comentario' });
        }

        await review.update({
            rating:  rating  ?? review.rating,
            comment: comment ?? review.comment,
        });

        res.json(toReviewDTO(review));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * DELETE /api/reviews/:id — Elimina un review por ID.
 * Body: { userId }  — userId simulado mientras no hay auth real.
 */
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review no encontrado' });
        }

        if (review.user_id !== userId) {
            return res.status(403).json({ message: 'No tienes permisos para modificar este comentario' });
        }

        await review.destroy();
        res.json({ message: `Review ${id} eliminado correctamente` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
