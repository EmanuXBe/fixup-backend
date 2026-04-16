import User from '../models/User.js';
import Review from '../models/Review.js';
import Service from '../models/Service.js';

/**
 * Obtiene la lista completa de todos los usuarios registrados.
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 */
export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Busca un usuario por su ID único.
 * @param {Object} req - Objeto de solicitud de Express con el parámetro ID.
 * @param {Object} res - Objeto de respuesta de Express.
 */
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/users/:id/reviews — Get all reviews created by a specific user.
 * Includes Service details (title, categoria) for each review.
 * @param {Object} req - Express request with user ID param.
 * @param {Object} res - Express response.
 */
export const getReviewsByUserId = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify user exists
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Fetch reviews with author and service details
        const reviews = await Review.findAll({
            where: { user_id: id },
            include: [
                { model: User,    attributes: ['id', 'username', 'email'] },
                { model: Service, attributes: ['id', 'title', 'categoria'] },
            ],
        });

        const formattedReviews = reviews.map((review) => {
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
        });

        res.json({
            user: {
                id: user.id,
                name: user.username,
                email: user.email,
            },
            reviews: formattedReviews,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
