import Review from '../models/Review.js';
import User from '../models/User.js';
import Service from '../models/Service.js';

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
 * GET /api/reviews/service/:serviceId — Get all reviews for a service.
 */
export const getReviewsByService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const reviews = await Review.findAll({ where: { serviceId } });
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/reviews/user/:userId — Get all reviews by a user.
 */
export const getReviewsByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const reviews = await Review.findAll({
            where: { user_id: userId },
            include: [{ model: Service, attributes: ['id', 'title', 'categoria'] }],
        });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * PUT /api/reviews/:id — Update a review by ID.
 * Body: { rating?, comment? }
 */
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
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
 */
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        await review.destroy();
        res.json({ message: `Review ${id} deleted successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
