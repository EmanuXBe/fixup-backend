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
                    // El alias 'user' debe coincidir con el definido en Review.belongsTo(User, { as: 'user' })
                    // de relations.js. Sin él, Sequelize serializa la asociación bajo 'User' (mayúscula)
                    // pero el acceso posterior con r.user retorna undefined.
                    as: 'user',
                    attributes: ['id', ['username', 'name'], 'profileImage'],
                },
                {
                    model: Service,
                    attributes: ['id', 'title', 'categoria'],
                },
            ],
            order: [['date', 'DESC']],
        });

        const formattedReviews = reviews.map((review) => {
            const r = review.toJSON();
            return {
                id:      r.id,
                rating:  r.rating,
                comment: r.comment,
                date:    r.date,
                authorName:            r.user?.name          ?? null,
                authorProfileImageUrl: r.user?.profileImage  ?? null,
                user: r.user
                    ? {
                        id:           r.user.id,
                        name:         r.user.name,
                        profileImage: r.user.profileImage ?? null,
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
                id: user.id,
                name: user.username,
                email: user.email,
                profileImage: user.profileImage || null,
            },
            reviews: formattedReviews,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/users — Sincronizar usuario recién creado de Firebase a PostgreSQL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PROPÓSITO:
 * Endpoint llamado por la aplicación móvil (o el frontend) inmediatamente después
 * de que un usuario se registra exitosamente en Firebase Auth.
 * 
 * PATRÓN DE DELEGACIÓN DE AUTENTICACIÓN (Delegated Authentication):
 * -------------------------------------------------------------------
 * - Identity Provider (IdP): Firebase maneja contraseñas, verificación de emails 
 *   y tokens de autenticación.
 * - Domain Profile Store: PostgreSQL actúa como el almacén del perfil de dominio, 
 *   manteniendo la información estructural del usuario para poder relacionarlo
 *   dentro de nuestro ecosistema (Reseñas, Servicios, Favoritos, etc.).
 * 
 * IMPORTANCIA DE ESTA RUTA:
 * Si la app móvil registra un usuario en Firebase pero no impacta este endpoint,
 * el usuario existirá en la nube de GCP pero NO en nuestro backend de Nest/Express.
 * Esto significa que la ruta GET /api/users/:uid arrojará 404, y cuando el 
 * usuario intente crear una reseña, fallará el constraint de llave foránea 
 * porque PostgreSQL no sabrá quién es ese usuario.
 *
 * @param {Object} req — req.body con { id (Firebase UID), email, name, profileImage }
 * @param {Object} res — Respuesta HTTP (201, 200, 400, o 409)
 */
export const createUser = async (req, res) => {
    try {
        const { id, email, name, profileImage } = req.body;

        /**
         * 1. Validaciones estructurales de payload
         */
        if (!id || !isValidFirebaseUid(id)) {
            return res.status(400).json({ 
                message: 'El UID proporcionado (id) es inválido o está vacío. Debe coincidir con un UUID de Firebase válido.' 
            });
        }

        if (!email || !name) {
            return res.status(400).json({ 
                message: 'El correo electrónico (email) y el nombre (name) son requeridos para inicializar el perfil.' 
            });
        }

        /**
         * 2. Manejo de Conflictos y Concurrencia
         * Verificamos preventivamente si el UID ya fue registrado, para no intentar
         * la creación doble y tener un Crash.
         * Devolver un 409 Conflict con manejo elegante (graceful fallback) permite
         * que la aplicación móvil sepa que el usuario ya existe pero que no 
         * debe bloquear su flujo normal (podría iniciar sesión sin problema).
         */
        const existingUser = await User.findByPk(id);
        if (existingUser) {
            return res.status(409).json({
                message: 'El perfil de usuario correspondiente a este UID ya está sincronizado en PostgreSQL.',
                user: existingUser
            });
        }

        /**
         * 3. Sincronización oficial en base de datos PostgreSQL.
         * Enlazamos el UUID descentralizado (de Firebase) con nuestro ecosistema.
         */
        const newUser = await User.create({
            id,             // Clave primaria, coincidente exacto con UID Firebase
            email,          // Tomado desde token Firebase o auth form
            username: name, // Transformar de nombre amigable al esquema username
            profileImage: profileImage || null
        });

        // Retornamos 201 Created si la escritura se completa de forma exitosa
        return res.status(201).json({
            message: 'El registro inicial se completó correctamente.',
            user: newUser
        });

    } catch (error) {
        /**
         * Manejo explícito del Unique constraint si el email se repite 
         * pero bajo un UID distinto (poco común dada la garantía de Firebase, pero defensivo).
         */
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                message: 'Otro perfil ya se encuentra registrado con este mismo correo electrónico.'
            });
        }
        
        return res.status(500).json({ message: error.message });
    }
};
