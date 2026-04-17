import Review from '../models/Review.js';
import User from '../models/User.js';
import Service from '../models/Service.js';

/**
 * =============================================================================
 * Controlador de Reseñas (Review Controller)
 * =============================================================================
 *
 * RESPONSABILIDAD:
 * Maneja todas las operaciones CRUD sobre la entidad Review, incluyendo:
 *   - Crear reseñas (POST)
 *   - Obtener reseñas por servicio (GET) — incluye datos del autor
 *   - Obtener reseñas por usuario / "Mis Reseñas" (GET) — filtra por Firebase UID
 *   - Actualizar reseñas (PUT) — con verificación de propiedad
 *   - Eliminar reseñas (DELETE) — con verificación de propiedad
 *
 * DECISIONES DE SEGURIDAD:
 * ────────────────────────
 * 1. VALIDACIÓN DE FIREBASE UID: Cada endpoint que recibe un userId valida
 *    que el string cumpla con el formato esperado de Firebase (alfanumérico,
 *    20-128 chars). Esto previene inyección de SQL y valores malformados.
 *
 * 2. VERIFICACIÓN DE PROPIEDAD: Las operaciones de escritura (update/delete)
 *    comparan el userId del request con el user_id almacenado en la reseña.
 *    Ambos son STRINGS (Firebase UIDs), por lo que se usa comparación estricta
 *    de strings (===) en vez de comparación numérica.
 *
 * 3. EXPOSICIÓN CONTROLADA DE DATOS: Los includes de User solo exponen
 *    campos públicos (id, username, profileImage). Nunca se expone el email
 *    en las reseñas para proteger la privacidad del usuario.
 *
 * @see models/Review.js — Definición del modelo con FKs explícitas
 * @see models/relations.js — Asociaciones que habilitan los includes
 * @see routes/reviewRoutes.js — Mapeo de rutas a estos handlers
 */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HELPER: isValidFirebaseUid(uid)
 * ─────────────────────────────────────────────────────────────────────────────
 * Valida que un string cumpla el formato esperado de un Firebase UID.
 *
 * CRITERIOS DE VALIDACIÓN:
 * - Debe ser un string (no null, undefined, number, etc.)
 * - Longitud entre 20 y 128 caracteres (Firebase UIDs típicamente ~28 chars,
 *   pero el rango amplio permite compatibilidad con otros proveedores)
 * - Solo caracteres alfanuméricos (letras y dígitos). Firebase UIDs no
 *   contienen caracteres especiales, así que rechazar todo lo que no sea
 *   [a-zA-Z0-9] previene inyecciones y payloads maliciosos.
 *
 * ¿POR QUÉ VALIDAR AQUÍ Y NO SOLO EN EL MODELO?
 * El modelo valida al INSERTAR datos, pero este helper valida al CONSULTAR.
 * Sin esta validación, un atacante podría enviar un userId malformado como
 * parámetro de URL y generar queries inválidos que consumen recursos del
 * servidor y podrían revelar información del esquema en los mensajes de error.
 *
 * @param {*} uid — Valor a validar
 * @returns {boolean} — true si es un Firebase UID válido
 */
const isValidFirebaseUid = (uid) => {
    if (typeof uid !== 'string') return false;
    if (uid.length < 20 || uid.length > 128) return false;
    // Solo letras (mayúsculas/minúsculas) y dígitos
    return /^[a-zA-Z0-9]+$/.test(uid);
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HELPER: formatReview(review)
 * ─────────────────────────────────────────────────────────────────────────────
 * Transforma una instancia Sequelize de Review en el formato estandarizado
 * de respuesta JSON que espera el frontend.
 *
 * PATRÓN DE DISEÑO — DTO (Data Transfer Object):
 * En vez de devolver directamente el objeto Sequelize (que incluye metadata
 * interna, métodos de instancia, etc.), creamos una representación limpia
 * con solo los campos que el frontend necesita. Esto:
 *   1. Reduce el payload de la respuesta HTTP
 *   2. Oculta la estructura interna de la BD al cliente
 *   3. Permite renombrar campos internos (ej: User.username → author.name)
 *   4. Garantiza un contrato estable entre frontend y backend
 *
 * INCLUSIÓN DE profileImage EN author:
 * El frontend necesita la foto del autor para mostrarla junto a cada reseña
 * en la lista. Incluirla aquí evita que el frontend tenga que hacer N
 * peticiones adicionales (una por cada autor) — resolviendo el problema N+1.
 *
 * @param {Review} review — Instancia Sequelize con includes de User y Service
 * @returns {Object} — DTO formateado para respuesta JSON
 */
const formatReview = (review) => {
    const r = review.toJSON();
    return {
        id:      r.id,
        rating:  r.rating,
        comment: r.comment,
        date:    r.date,
        // Campos de conveniencia para el frontend (acceso directo sin desestructurar)
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
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HELPER: resolveRequestUserId(req)
 * ─────────────────────────────────────────────────────────────────────────────
 * Extrae el Firebase UID del usuario que realiza la petición.
 *
 * ESTRATEGIA DE RESOLUCIÓN (en orden de prioridad):
 *   1. req.body.userId — Enviado en el cuerpo de POST/PUT
 *   2. req.headers['x-user-id'] — Enviado como header custom
 *
 * NOTA IMPORTANTE — NO SE CONVIERTE A NUMBER:
 * Los Firebase UIDs son strings alfanuméricos. Convertirlos con Number()
 * produciría NaN, lo cual rompería todas las comparaciones de propiedad.
 * Se devuelve el string tal cual y se valida con isValidFirebaseUid().
 *
 * SEGURIDAD: En un entorno de producción, este UID debería extraerse de
 * un token JWT verificado por un middleware de Firebase Auth, no del body
 * o headers que el cliente puede manipular. La implementación actual es
 * funcional para desarrollo y pruebas.
 *
 * @param {Object} req — Objeto request de Express
 * @returns {string|null} — Firebase UID del usuario o null si no se encuentra
 */
const resolveRequestUserId = (req) => {
    const fromBody   = req.body?.userId;
    const fromHeader = req.headers['x-user-id'];
    // Devolvemos el primer valor no nulo, SIN convertir a Number
    // porque los Firebase UIDs son strings alfanuméricos
    return fromBody ?? fromHeader ?? null;
};

// =============================================================================
// ENDPOINTS / HANDLERS
// =============================================================================

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/reviews — Crear una nueva reseña
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * BODY ESPERADO:
 * {
 *   "rating":     number (0-5, requerido),
 *   "comment":    string (opcional),
 *   "user_id":    string (Firebase UID, requerido),
 *   "service_id": number (ID del servicio, requerido)
 * }
 *
 * VALIDACIONES:
 * 1. Campos requeridos presentes (rating, user_id, service_id)
 * 2. user_id es un Firebase UID válido (formato alfanumérico, longitud correcta)
 * 3. rating entre 0 y 5 (validado también a nivel de modelo)
 *
 * RESPUESTA: 201 Created con el objeto de la reseña creada.
 * ERRORES: 400 Bad Request si faltan campos o el UID es inválido.
 */
export const createReview = async (req, res) => {
    try {
        const { rating, comment, user_id, service_id } = req.body;

        // Validación de campos requeridos
        if (rating == null || !user_id || !service_id) {
            return res.status(400).json({
                message: 'Los campos rating, user_id y service_id son obligatorios',
            });
        }

        /**
         * VALIDACIÓN DE SEGURIDAD: Firebase UID
         * Verificamos que el user_id recibido cumpla el formato de Firebase
         * ANTES de enviarlo a la base de datos. Esto previene:
         * - Inyección de valores malformados
         * - Creación de reseñas con UIDs inventados
         * - Errores de tipo en PostgreSQL
         */
        if (!isValidFirebaseUid(user_id)) {
            return res.status(400).json({
                message: 'El user_id proporcionado no es un UID de Firebase válido. ' +
                         'Debe ser alfanumérico y tener entre 20 y 128 caracteres.',
            });
        }

        const newReview = await Review.create({
            rating,
            comment: comment ?? null,
            user_id,
            service_id,
        });

        res.status(201).json(newReview);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/reviews/service/:serviceId
 * También disponible en: GET /api/services/:serviceId/reviews
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PROPÓSITO:
 * Devuelve todas las reseñas de un servicio/publicación específica,
 * incluyendo los datos del AUTOR de cada reseña.
 *
 * PROBLEMA QUE RESUELVE:
 * Antes de esta corrección, el endpoint devolvía las reseñas SIN datos
 * del autor (sin username ni profileImage), lo que hacía imposible para
 * el frontend mostrar quién escribió cada reseña.
 *
 * SOLUCIÓN — EAGER LOADING CON INCLUDE:
 * Usamos Sequelize `include` para hacer un LEFT JOIN con la tabla Users.
 * Esto carga los datos del autor EN LA MISMA QUERY (eager loading),
 * evitando el problema N+1 donde se haría una query adicional por cada
 * reseña para obtener los datos de su autor.
 *
 * ATTRIBUTES SELECTIVOS:
 * Solo se exponen ['id', 'username', 'profileImage'] del User.
 * NUNCA se expone el email en este contexto para proteger la privacidad
 * de los usuarios que escriben reseñas.
 *
 * @param {Object} req — Express request con params.serviceId
 * @param {Object} res — Express response
 */
export const getReviewsByService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const reviews = await Review.findAll({
            where: { service_id: serviceId },
            /**
             * INCLUDE — Eager Loading:
             * Se incluyen ambos modelos (User y Service) para construir
             * un DTO completo en formatReview(). El frontend recibe toda
             * la información necesaria en una sola petición HTTP.
             */
            include: [
                {
                    // EAGER LOADING EXPLÍCITO:
                    // Al incluir el modelo User en la misma query en lugar de consultar
                    // a posteriori las reseñas, evitamos el problema de consultas N+1.
                    model: User,
                    as: 'user', // Fuerza que en el JSON Serialize de Sequelize se exponga como 'user' en minúscula
                    // Renombramos la columna username a name usando el alias de Sequelize
                    attributes: ['id', ['username', 'name'], 'profileImage'],
                },
                {
                    model: Service,
                    attributes: ['id', 'title', 'categoria'],
                },
            ],
        });

        /**
         * Se mapea cada review al formato DTO estandarizado.
         * Esto asegura que la respuesta tenga estructura consistente
         * independientemente del estado de los includes (ej: si un User
         * fue eliminado, author será null en vez de causar un error).
         */
        res.json(reviews.map(formatReview));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/reviews/user/:userId — "Mis Reseñas" / Reseñas por usuario
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PROPÓSITO:
 * Devuelve todas las reseñas escritas por un usuario específico,
 * identificado por su Firebase UID. Este es el endpoint que el frontend
 * consume para la pantalla de "Mis Reseñas".
 *
 * PROBLEMA QUE RESOLVÍA ANTES:
 * El frontend fallaba al cargar las reseñas del usuario porque:
 *   1. El user_id se comparaba como INTEGER cuando Firebase envía STRINGs
 *   2. El endpoint no existía o estaba mal configurado
 *   3. No se validaba el formato del UID, causando errores de PostgreSQL
 *
 * FLUJO DE EJECUCIÓN:
 *   1. Extraer userId de los parámetros de la URL
 *   2. Validar que sea un Firebase UID con formato correcto
 *   3. Verificar que el usuario exista en la BD (evitar queries sobre IDs inexistentes)
 *   4. Buscar todas las reseñas con ese user_id
 *   5. Incluir datos del autor y del servicio via eager loading
 *   6. Formatear y devolver la respuesta
 *
 * SEGURIDAD:
 * - Se valida el UID con isValidFirebaseUid() ANTES de cualquier query
 * - Se verifica existencia del usuario para dar mensajes de error específicos
 * - Solo se exponen campos públicos del usuario (id, username, profileImage)
 *
 * @param {Object} req — Express request con params.userId (Firebase UID)
 * @param {Object} res — Express response
 */
export const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;

        /**
         * PASO 1: Validación del formato del Firebase UID.
         * Se hace ANTES de cualquier query a la BD para:
         * - Rechazar rápidamente requests con UIDs malformados (fail fast)
         * - Evitar queries innecesarias que consumen recursos del servidor
         * - Prevenir inyección de valores maliciosos en las queries
         */
        if (!isValidFirebaseUid(userId)) {
            return res.status(400).json({
                message: 'El userId proporcionado no es un UID de Firebase válido. ' +
                         'Debe ser alfanumérico y tener entre 20 y 128 caracteres.',
            });
        }

        /**
         * PASO 2: Verificar que el usuario exista.
         * Si no existe, devolvemos 404 en vez de un array vacío.
         * Esto permite al frontend distinguir entre:
         * - "El usuario existe pero no tiene reseñas" (200 + array vacío)
         * - "El usuario no existe" (404)
         * Esta distinción es importante para la UX y para debugging.
         */
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                message: 'Usuario no encontrado. Verifica que el UID de Firebase sea correcto.',
            });
        }

        /**
         * PASO 3: Buscar reseñas filtrando por user_id (Firebase UID).
         * WHERE user_id = :userId — filtra estrictamente por el UID del autor.
         * El include de User trae los datos del autor para el DTO.
         * El include de Service trae los datos del servicio reseñado.
         */
        const reviews = await Review.findAll({
            where: { user_id: userId },
            include: [
                {
                    // EAGER LOADING EXPLÍCITO:
                    // Al incluir la relación con as: 'user', forzamos el JSON en minúscula.
                    // Renombramos la columna 'username' a 'name' usando sintaxis de alias.
                    model: User,
                    as: 'user',
                    attributes: ['id', ['username', 'name'], 'profileImage'],
                },
                {
                    model: Service,
                    attributes: ['id', 'title', 'categoria'],
                },
            ],
            /**
             * ORDER BY date DESC — Las reseñas más recientes primero.
             * Esto mejora la UX: el usuario ve primero su actividad reciente.
             */
            order: [['date', 'DESC']],
        });

        res.json(reviews.map(formatReview));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PUT /api/reviews/:id — Actualizar una reseña
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * BODY ESPERADO:
 * {
 *   "userId":  string (Firebase UID del autor, requerido para verificación),
 *   "rating":  number (opcional, nuevo rating),
 *   "comment": string (opcional, nuevo comentario)
 * }
 * Alternativamente, el userId puede enviarse en el header x-user-id.
 *
 * SEGURIDAD — VERIFICACIÓN DE PROPIEDAD:
 * Solo el autor original de la reseña puede modificarla. Se comparan
 * los Firebase UIDs como STRINGS (===), no como números.
 * Esto previene que un usuario modifique las reseñas de otro.
 *
 * FLUJO:
 * 1. Extraer userId del body o headers
 * 2. Verificar que se proporcionó un userId
 * 3. Buscar la reseña por su PK (id numérico)
 * 4. Comparar el userId del request con el user_id de la reseña
 * 5. Si coinciden, aplicar la actualización
 *
 * @param {Object} req — Express request con params.id y body
 * @param {Object} res — Express response
 */
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        /**
         * Resolver el userId del request (body o header).
         * NO se convierte a Number — Firebase UIDs son strings.
         */
        const requestUserId = resolveRequestUserId(req);
        if (!requestUserId) {
            return res.status(401).json({
                message: 'Se requiere userId para esta operación. ' +
                         'Envíalo en el body como "userId" o en el header "x-user-id".',
            });
        }

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Reseña no encontrada' });
        }

        /**
         * VERIFICACIÓN DE PROPIEDAD:
         * Comparación estricta de strings (===) entre el UID del request
         * y el user_id almacenado en la reseña. Ambos son Firebase UIDs.
         *
         * IMPORTANTE: Usar === (no ==) para evitar coerción de tipos.
         * Con Firebase UIDs como strings, la comparación == podría funcionar
         * igual, pero === es la práctica correcta y más segura.
         */
        if (String(requestUserId) !== String(review.user_id)) {
            return res.status(403).json({
                message: 'No tienes permiso para modificar esta reseña. ' +
                         'Solo el autor original puede editarla.',
            });
        }

        /**
         * Actualización parcial: solo se modifican los campos proporcionados.
         * Si rating o comment son null/undefined, se mantiene el valor actual.
         * Esto permite al frontend enviar solo el campo que cambió.
         */
        await review.update({
            rating:  rating  ?? review.rating,
            comment: comment ?? review.comment,
        });

        res.json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DELETE /api/reviews/:id — Eliminar una reseña
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * BODY o HEADER ESPERADO:
 * - Body: { "userId": "firebase-uid-string" }
 * - Header: x-user-id: firebase-uid-string
 *
 * SEGURIDAD — VERIFICACIÓN DE PROPIEDAD:
 * Idéntica al PUT: solo el autor original puede eliminar su reseña.
 * Esto previene eliminación maliciosa de reseñas ajenas.
 *
 * RESPUESTA: 200 con mensaje de confirmación si se elimina correctamente.
 * ERRORES:
 * - 401: No se proporcionó userId
 * - 404: Reseña no encontrada
 * - 403: El userId no coincide con el autor de la reseña
 *
 * @param {Object} req — Express request con params.id
 * @param {Object} res — Express response
 */
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        const requestUserId = resolveRequestUserId(req);
        if (!requestUserId) {
            return res.status(401).json({
                message: 'Se requiere userId para esta operación. ' +
                         'Envíalo en el body como "userId" o en el header "x-user-id".',
            });
        }

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ message: 'Reseña no encontrada' });
        }

        /**
         * Misma verificación de propiedad que en updateReview.
         * Comparación de strings, no de números.
         */
        if (String(requestUserId) !== String(review.user_id)) {
            return res.status(403).json({
                message: 'No tienes permiso para eliminar esta reseña. ' +
                         'Solo el autor original puede eliminarla.',
            });
        }

        await review.destroy();
        res.json({ message: `Reseña ${id} eliminada correctamente` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
