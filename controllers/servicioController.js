import Servicio from '../models/Servicio.js';

/**
 * Obtiene la lista completa de todos los servicios disponibles.
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 */
export const getServicios = async (req, res) => {
    try {
        const servicios = await Servicio.findAll();
        res.json(servicios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Busca un servicio específico mediante su ID.
 * @param {Object} req - Objeto de solicitud de Express con el parámetro ID.
 * @param {Object} res - Objeto de respuesta de Express.
 */
export const getServicioById = async (req, res) => {
    try {
        const { id } = req.params;
        const servicio = await Servicio.findByPk(id);
        if (!servicio) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }
        res.json(servicio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
