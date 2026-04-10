import User from '../models/User.js';

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
