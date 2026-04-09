import Review from "../models/Review.js";
import User from "../models/User.js";
import Service from "../models/Service.js";

/**
 * POST /api/reviews — Create a new review.
 * Body: { rating, comment, user_id, service_id }
 */
export const createReview = async (req, res) => {
  try {
    const { rating, comment, service_id } = req.body;
    const fixedUserId = 1;

    if (rating == null || !service_id) {
      return res.status(400).json({
        message: "Fields rating and service_id are required",
      });
    }

    const newReview = await Review.create({
      rating,
      comment: comment ?? null,
      user_id: fixedUserId,
      service_id,
    });

    const createdWithUser = await Review.findByPk(newReview.id, {
      include: [
        {
          model: User,
          attributes: ["id", "username", ["username", "name"], "email"],
        },
      ],
    });

    res.status(201).json(createdWithUser);
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

    const reviews = await Review.findAll({
      where: { service_id: serviceId },
      include: [
        {
          model: User,
          where: { id: 1 },
          attributes: ["id", "username", ["username", "name"], "email"],
        },
      ],
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/reviews/user/:userId — Get all reviews by a user.
 */
export const getReviewsByUser = async (req, res) => {
  try {
    const fixedUserId = 1;

    const reviews = await Review.findAll({
      where: { user_id: fixedUserId },
      include: [
        {
          model: Service,
          attributes: ["id", "title", "categoria"],
        },
        {
          model: User,
          attributes: ["id", "username", ["username", "name"], "email"],
        },
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
 */
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await review.update({
      rating: rating ?? review.rating,
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
      return res.status(404).json({ message: "Review not found" });
    }

    await review.destroy();
    res.json({ message: `Review ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
