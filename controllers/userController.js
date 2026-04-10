import User from '../models/User.js';

// ─── DTO ─────────────────────────────────────────────────────────────────────

const toUserDTO = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    photo: user.photo ?? null,
});

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/users — Lista todos los usuarios sin exponer la contraseña.
 */
export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'photo'],
        });
        res.json(users.map(toUserDTO));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/users/:id — Obtiene un usuario por ID sin exponer la contraseña.
 */
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: ['id', 'name', 'email', 'photo'],
        });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(toUserDTO(user));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
