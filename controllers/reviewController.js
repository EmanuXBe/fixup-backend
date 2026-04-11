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
 * Includes User (who wrote it) and Service (article details).
 */
export const getReviewsByService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const reviews = await Review.findAll({
            where: { service_id: serviceId },
            include: [
                { model: User, attributes: ['id', 'username', 'email'] },
                { model: Service, attributes: ['id', 'title', 'categoria'] },
            ],
        });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/reviews/user/:userId — Get all reviews for a specific user.
 * Includes User (id, username, email) and Service (article/service details).
 */
export const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;

        const reviews = await Review.findAll({
            where: { user_id: userId },
            include: [
                { model: User, attributes: ['id', 'username', 'email'] },
                { model: Service, attributes: ['id', 'title', 'categoria'] },
            ],
        });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * PUT /api/reviews/:id — Update a review by ID.
 * Body: { rating?, comment? }
 * Security: Only the review owner (req.user.id === review.user_id) can update.
 */
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        // Verify authentication token exists
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Verify ownership: only the author can update their review
        if (req.user.id !== review.user_id) {
            return res.status(403).json({
                message: 'Forbidden: you can only update your own reviews',
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
 * Security: Only the review owner (req.user.id === review.user_id) can delete.
 */
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify authentication token exists
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Verify ownership: only the author can delete their review
        if (req.user.id !== review.user_id) {
            return res.status(403).json({
                message: 'Forbidden: you can only delete your own reviews',
            });
        }

        await review.destroy();
        res.json({ message: `Review ${id} deleted successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
