import Service from '../models/Service.js';

// ─── DTO ─────────────────────────────────────────────────────────────────────

const toServiceDTO = (service) => ({
    id: service.id,                          // Int
    title: service.title,                    // String
    description: service.description ?? null, // String?
    image_url: service.image_url ?? null,    // String?
    categoria: service.categoria ?? null,    // String?
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 10;
const MAX_LIMIT     = 50;

const parsePagination = (query) => {
    const page  = Math.max(1, parseInt(query.page,  10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/services?page=1&limit=10&categoria=Plomería
 * Devuelve el feed paginado. Sin paginación retornaría toda la tabla,
 * saturando la red y aumentando el tiempo de respuesta en el cliente Android.
 */
export const getServices = async (req, res) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { categoria } = req.query;

        const where = categoria ? { categoria } : {};

        const { count, rows } = await Service.findAndCountAll({
            where,
            limit,
            offset,
            order: [['id', 'ASC']],
        });

        res.json({
            data: rows.map(toServiceDTO),
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/services/:id
 */
export const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findByPk(id);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.json(toServiceDTO(service));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/services
 * Body: { title, description?, image_url?, categoria? }
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
            image_url:   image_url   ?? null,
            categoria:   categoria   ?? null,
        });

        res.status(201).json(toServiceDTO(newService));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
