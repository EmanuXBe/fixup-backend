import Service from '../models/Service.js';

/**
 * GET /api/services — Returns all services.
 */
export const getServices = async (req, res) => {
    try {
        const services = await Service.findAll();
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/services/:id — Returns a single service by ID.
 */
export const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findByPk(id);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/services — Creates a new service.
 * Body: { title, description, image_url, categoria }
 * The client uploads the image to Firebase Storage and sends the resulting URL.
 */
export const createService = async (req, res) => {
    try {
        const { title, description, image_url, categoria } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'The title field is required' });
        }

        const newService = await Service.create({
            title,
            description: description ?? null,
            image_url: image_url ?? null,
            categoria: categoria ?? null,
        });

        res.status(201).json(newService);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
