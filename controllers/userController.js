import User from '../models/User.js';
import Review from '../models/Review.js';
import Service from '../models/Service.js';

/**
 * =============================================================================
 * Controlador de Usuarios (User Controller)
 * =============================================================================
 *
 * RESPONSABILIDAD:
 * Maneja las operaciones de lectura sobre la entidad User, incluyendo:
 *   - Listar todos los usuarios (GET /api/users)
 *   - Obtener un usuario por su Firebase UID (GET /api/users/:id)
 *   - Obtener reseñas de un usuario específico (GET /api/users/:id/reviews)
 *
 * NOTA SOBRE FIREBASE UIDs:
 * ─────────────────────────
 * El parámetro :id en todas las rutas corresponde al Firebase UID del usuario,
 * que es un string alfanumérico de ~28 caracteres. Todas las búsquedas por
 * User.findByPk(id) funcionan correctamente porque User.id es de tipo STRING
 * en el modelo Sequelize.
 *
 * @see models/User.js — Modelo con PK tipo STRING (Firebase UID)
 * @see routes/userRoutes.js — Mapeo de rutas a estos handlers
 */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HELPER: isValidFirebaseUid(uid)
 * ─────────────────────────────────────────────────────────────────────────────
 * Valida el formato de un Firebase UID.
 * Duplicado intencionalmente en cada controller para mantener independencia
 * entre módulos (cada controller es autocontenido). En una arquitectura más
 * grande, se extraería a un módulo compartido utils/validators.js.
 *
 * @param {*} uid — Valor a validar
 * @returns {boolean} — true si es un Firebase UID válido
 */
const isValidFirebaseUid = (uid) => {
    if (typeof uid !== 'string') return false;
    if (uid.length < 20 || uid.length > 128) return false;
    return /^[a-zA-Z0-9]+$/.test(uid);
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/users — Obtener la lista completa de usuarios
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Devuelve todos los usuarios registrados en la plataforma.
 * En producción, este endpoint debería estar paginado y/o protegido
 * por autenticación de administrador para evitar exposición masiva de datos.
 *
 * @param {Object} req — Objeto de solicitud de Express
 * @param {Object} res — Objeto de respuesta de Express
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
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/users/:id — Obtener un usuario por su Firebase UID
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Busca un usuario usando findByPk() donde PK = Firebase UID (STRING).
 *
 * VALIDACIÓN:
 * Se valida el formato del UID antes de hacer la query para:
 * - Rechazar rápidamente requests malformados (fail fast)
 * - Evitar queries innecesarias a la BD
 * - Dar mensajes de error descriptivos al frontend
 *
 * @param {Object} req — Express request con params.id (Firebase UID)
 * @param {Object} res — Express response
 */
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        /**
         * Validación del formato del Firebase UID.
         * Si el UID no cumple el formato esperado, se devuelve 400
         * en vez de dejar que PostgreSQL maneje el error.
         */
        if (!isValidFirebaseUid(id)) {
            return res.status(400).json({
                message: 'El ID proporcionado no es un UID de Firebase válido. ' +
                         'Debe ser alfanumérico y tener entre 20 y 128 caracteres.',
            });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/users/:id/reviews — Obtener reseñas de un usuario específico
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PROPÓSITO:
 * Ruta alternativa para obtener las reseñas de un usuario. Complementa
 * GET /api/reviews/user/:userId (en reviewRoutes.js).
 *
 * DIFERENCIA CON /api/reviews/user/:userId:
 * Esta ruta está anidada bajo /api/users, lo cual sigue la convención REST
 * de recursos anidados: "las reseñas DE un usuario". La respuesta incluye
 * un objeto `user` con los datos del autor además del array de reviews,
 * cosa que la otra ruta no hace.
 *
 * FORMATO DE RESPUESTA:
 * {
 *   "user": { id, name, email, profileImage },
 *   "reviews": [{ id, rating, comment, date, author, service }, ...]
 * }
 *
 * SEGURIDAD:
 * - Validación de Firebase UID antes de cualquier query
 * - Solo se exponen campos públicos del usuario
 * - profileImage incluido para que el frontend muestre la foto
 *
 * @param {Object} req — Express request con params.id (Firebase UID)
 * @param {Object} res — Express response
 */
export const getReviewsByUserId = async (req, res) => {
    try {
        const { id } = req.params;

        /**
         * PASO 1: Validar formato del Firebase UID.
         * Fail fast — rechazar requests malformados antes de tocar la BD.
         */
        if (!isValidFirebaseUid(id)) {
            return res.status(400).json({
                message: 'El ID proporcionado no es un UID de Firebase válido. ' +
                         'Debe ser alfanumérico y tener entre 20 y 128 caracteres.',
            });
        }

        /**
         * PASO 2: Verificar existencia del usuario.
         * Si no existe, devolvemos 404 (no un array vacío) para que el
         * frontend pueda distinguir entre "usuario sin reseñas" y
         * "usuario inexistente".
         */
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        /**
         * PASO 3: Buscar reseñas con eager loading.
         * El include de User trae datos del autor (para el DTO).
         * El include de Service trae datos del servicio reseñado.
         * profileImage se incluye en los attributes de User para que
         * el frontend pueda mostrar la foto del autor junto a cada reseña.
         */
        const reviews = await Review.findAll({
            where: { user_id: id },
            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'profileImage'],
                },
                {
                    model: Service,
                    attributes: ['id', 'title', 'categoria'],
                },
            ],
            order: [['date', 'DESC']],
        });

        /**
         * Formateo DTO — Transforma cada review Sequelize al formato
         * estandarizado que espera el frontend.
         */
        const formattedReviews = reviews.map((review) => {
            const r = review.toJSON();
            return {
                id:      r.id,
                rating:  r.rating,
                comment: r.comment,
                date:    r.date,
                author: r.User
                    ? {
                        id:           r.User.id,
                        name:         r.User.username,
                        profileImage: r.User.profileImage || null,
                    }
                    : null,
                service: r.Service
                    ? { id: r.Service.id, title: r.Service.title, categoria: r.Service.categoria }
                    : null,
            };
        });

        /**
         * Respuesta con datos del usuario Y sus reseñas.
         * El objeto `user` de primer nivel permite al frontend mostrar
         * el perfil del usuario en la cabecera de la pantalla "Mis Reseñas".
         */
        res.json({
            user: {
                id:           user.id,
                name:         user.username,
                email:        user.email,
                profileImage: user.profileImage || null,
            },
            reviews: formattedReviews,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
