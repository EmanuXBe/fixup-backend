import Service from '../models/Service.js';
import { AppError } from '../middlewares/errorMiddleware.js';

/**
 * GET /api/services — Returns all services.
 */
export const getServices = async (req, res, next) => {
    try {
        const services = await Service.findAll();
        res.json(services);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/services/:id — Returns a single service by ID.
 */
export const getServiceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const service = await Service.findByPk(id);
        if (!service) {
            throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
        }
        res.json(service);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/services — Creates a new service.
 */
export const createService = async (req, res, next) => {
    try {
        const { title, description, image_url, categoria } = req.body;

        if (!title) {
            throw new AppError('The title field is required', 400, 'MISSING_TITLE');
        }

        const newService = await Service.create({
            title,
            description: description ?? null,
            image_url: image_url ?? null,
            categoria: categoria ?? null,
        });

        res.status(201).json({
            status: 'success',
            data: newService
        });
    } catch (error) {
        next(error);
    }
};
