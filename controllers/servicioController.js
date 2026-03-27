import Servicio from '../models/Servicio.js';

export const getServicios = async (req, res) => {
    try {
        const servicios = await Servicio.findAll();
        res.json(servicios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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
