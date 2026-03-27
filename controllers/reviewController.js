import Review from '../models/Review.js';
import User from '../models/User.js';
import Servicio from '../models/Servicio.js';

/**
 * 1. Crear un nuevo review.
 * Body: { calificacion, comentario, userId, articleId }
 * El body acepta los alias del enunciado (rating → calificacion, user_id → userId, servicio_id → articleId).
 */
export const createReview = async (req, res) => {
    try {
        const {
            rating, calificacion,
            comment, comentario,
            user_id, userId,
            servicio_id, articleId,
        } = req.body;

        // Soporte para ambos nombres de campo (del enunciado y del modelo)
        const finalCalificacion = calificacion ?? rating;
        const finalComentario   = comentario   ?? comment   ?? null;
        const finalUserId       = userId       ?? user_id;
        const finalArticleId    = articleId    ?? servicio_id;

        if (finalCalificacion == null || !finalUserId || !finalArticleId) {
            return res.status(400).json({
                message: 'Los campos calificacion, user_id y servicio_id son obligatorios',
            });
        }

        const nuevoReview = await Review.create({
            calificacion: finalCalificacion,
            comentario:   finalComentario,
            userId:       finalUserId,
            articleId:    finalArticleId,
        });

        res.status(201).json(nuevoReview);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * 2. Obtener todos los reviews de un servicio específico.
 * GET /api/reviews/servicio/:servicioId
 */
export const getReviewsByServicio = async (req, res) => {
    try {
        const { servicioId } = req.params;

        const reviews = await Review.findAll({
            where: { articleId: servicioId },
            include: [{ model: User, attributes: ['id', 'username', 'email'] }],
        });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * 3. Obtener todos los reviews hechos por un usuario específico.
 * GET /api/reviews/user/:userId
 */
export const getReviewsByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const reviews = await Review.findAll({
            where: { userId },
            include: [{ model: Servicio, attributes: ['id', 'nombre', 'categoria'] }],
        });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * 4. Actualizar un review por su ID.
 * PUT /api/reviews/:id
 * Body: { calificacion?, comentario? }
 */
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, calificacion, comment, comentario } = req.body;

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review no encontrado' });
        }

        await review.update({
            calificacion: calificacion ?? rating   ?? review.calificacion,
            comentario:   comentario   ?? comment  ?? review.comentario,
        });

        res.json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * 5. Eliminar un review por su ID.
 * DELETE /api/reviews/:id
 */
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Review no encontrado' });
        }

        await review.destroy();
        res.json({ message: `Review ${id} eliminado correctamente` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
