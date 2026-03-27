import Servicio from '../models/Servicio.js';

/**
 * Obtiene la lista completa de todos los servicios disponibles.
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

/**
 * Crea un nuevo servicio.
 * Recibe: nombre, descripcion, imagenUrl (URL de Firebase Storage), categoria.
 * El frontend se encarga de subir la imagen a Firebase y envía la URL resultante.
 */
export const createServicio = async (req, res) => {
    try {
        const { nombre, descripcion, imagenUrl, categoria } = req.body;

        if (!nombre) {
            return res.status(400).json({ message: 'El campo nombre es obligatorio' });
        }

        const nuevoServicio = await Servicio.create({
            nombre,
            descripcion: descripcion ?? null,
            imagenUrl: imagenUrl ?? null,
            categoria: categoria ?? null,
        });

        res.status(201).json(nuevoServicio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

