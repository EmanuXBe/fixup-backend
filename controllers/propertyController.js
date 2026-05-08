import { db } from '../config/firebase.js';
import admin from '../config/firebase.js';

// =============================================================================
// HELPERS PRIVADOS
// =============================================================================

/**
 * Extrae el userId del request.
 *
 * Acepta dos fuentes para mantener coherencia con el resto del proyecto
 * (mismo patrón que reviewController.js → resolveRequestUserId):
 *   1. req.body.userId     — campo JSON en el cuerpo de la petición
 *   2. req.headers['x-user-id'] — header HTTP alternativo
 *
 * En una API de producción real se verificaría el ID Token de Firebase con
 * admin.auth().verifyIdToken(token) para evitar suplantación de identidad.
 * Para este proyecto académico, confiamos en el UID que envía el cliente
 * (patrón "delegated trust", consistente con el resto de endpoints).
 */
const resolveRequestUserId = (req) =>
    req.body?.userId ?? req.headers['x-user-id'] ?? null;

/**
 * Valida el formato de un Firebase UID.
 * Firebase UID: string alfanumérico de 20-128 caracteres.
 * Duplicado intencionalmente por módulo para mantener cada controlador
 * autocontenido (mismo criterio que userController.js y reviewController.js).
 */
const isValidFirebaseUid = (uid) => {
    if (typeof uid !== 'string') return false;
    if (uid.length < 20 || uid.length > 128) return false;
    return /^[a-zA-Z0-9]+$/.test(uid);
};

/**
 * Enum de valores permitidos para el campo "tipo".
 *
 * ¿POR QUÉ centralizar el enum aquí?
 * Si se agrega un nuevo tipo (ej: 'Compartido'), solo se modifica esta
 * constante y la validación se actualiza automáticamente en todos los
 * controladores que la usen. Evita magic strings dispersos en el código.
 */
const TIPOS_PERMITIDOS = ['Arriendo', 'Venta'];

// =============================================================================
// CONTROLADORES
// =============================================================================

/**
 * =============================================================================
 * POST /api/properties — Publicar un nuevo inmueble
 * =============================================================================
 *
 * RESPONSABILIDAD:
 * Valida los datos del inmueble recibidos desde la app Android y crea
 * un nuevo documento en la colección "properties" de Firestore,
 * asociado al usuario autenticado.
 *
 * FLUJO DE EJECUCIÓN:
 *   1. Extraer userId del request (body o header x-user-id)
 *   2. Validar que el userId sea un Firebase UID con formato correcto
 *   3. Validar presencia y formato de cada campo obligatorio
 *   4. Validar que "tipo" pertenezca al enum permitido
 *   5. Normalizar el campo "imagenes" (opcional → array vacío por defecto)
 *   6. Construir el documento con serverTimestamp de Firestore
 *   7. Persistir en Firestore con ID autogenerado
 *   8. Responder 201 con el ID generado y los datos del inmueble
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const createProperty = async (req, res) => {
    try {
        // ─── PASO 1: Extraer el ID del usuario autenticado ────────────────────
        /**
         * ¿POR QUÉ extraemos el userId desde el body/header y no de un JWT?
         *
         * Esta API usa el patrón "delegated trust": Firebase Auth verifica las
         * credenciales en el cliente (app Android) y emite un UID. El backend
         * confía en ese UID porque, en el flujo normal, solo la app con el SDK
         * de Firebase puede obtener un UID válido tras autenticarse.
         *
         * Se acepta desde body O header para ser coherente con todos los demás
         * endpoints del proyecto que ya siguen este mismo patrón.
         */
        const userId = resolveRequestUserId(req);

        if (!userId) {
            return res.status(401).json({
                message:
                    'Se requiere el ID del usuario autenticado. ' +
                    'Envíalo en el campo "userId" del body o en el header "x-user-id".',
            });
        }

        // Rechazar UIDs con formato inválido antes de hacer cualquier otra operación
        if (!isValidFirebaseUid(userId)) {
            return res.status(401).json({
                message:
                    'El userId no es un UID de Firebase válido ' +
                    '(debe ser alfanumérico y tener entre 20 y 128 caracteres).',
            });
        }

        // ─── PASO 2: Extraer y validar los campos del body ────────────────────
        /**
         * ¿POR QUÉ validamos datos ANTES de escribir en la base de datos?
         *
         * Principio "Fail Fast": rechazar datos inválidos lo antes posible evita:
         *   a) Escrituras innecesarias en Firestore (cada write tiene costo)
         *   b) Documentos incompletos/corruptos que romperían la UI al renderizarlos
         *   c) Errores tardíos difíciles de trazar en producción
         *   d) Vectores de ataque: sin validación, un atacante podría insertar
         *      documentos con campos vacíos, negativos o tipos incorrectos
         *
         * HTTP 400 Bad Request indica que EL CLIENTE envió datos incorrectos
         * (distinto de 500, que indica un fallo INTERNO del servidor).
         */
        const { titulo, ubicacion, descripcion, precio, tipo, imagenes } = req.body;

        // Validar "titulo"
        if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
            return res.status(400).json({
                message: 'El campo "titulo" es obligatorio y debe ser texto no vacío.',
            });
        }

        // Validar "ubicacion"
        if (!ubicacion || typeof ubicacion !== 'string' || ubicacion.trim() === '') {
            return res.status(400).json({
                message: 'El campo "ubicacion" es obligatorio y debe ser texto no vacío.',
            });
        }

        // Validar "descripcion"
        if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
            return res.status(400).json({
                message: 'El campo "descripcion" es obligatorio y debe ser texto no vacío.',
            });
        }

        // Validar "precio": debe existir, ser numérico y no negativo
        if (precio == null || isNaN(Number(precio)) || Number(precio) < 0) {
            return res.status(400).json({
                message:
                    'El campo "precio" es obligatorio y debe ser un número mayor o igual a 0.',
            });
        }

        // Validar presencia de "tipo" antes del enum check
        if (!tipo) {
            return res.status(400).json({
                message: `El campo "tipo" es obligatorio. Valores permitidos: ${TIPOS_PERMITIDOS.join(', ')}.`,
            });
        }

        // ─── PASO 3: Validar el enum "tipo" ──────────────────────────────────
        /**
         * ¿POR QUÉ validar el enum en el backend si el frontend ya lo filtra?
         *
         * El frontend (app Android) es solo la PRIMERA línea de defensa.
         * Cualquiera puede hacer una petición directa con Postman, curl o
         * un script malicioso, enviando un "tipo" arbitrario.
         * El backend es la ÚNICA barrera que garantiza la integridad del
         * dato en Firestore.
         *
         * Un "tipo" inválido causaría:
         *   - Filtros rotos en la pantalla de búsqueda (where tipo == 'Arriendo')
         *   - Lógica de negocio incorrecta en cálculos de precios o contratos
         *   - UI inconsistente para otros usuarios que ven el listado
         */
        if (!TIPOS_PERMITIDOS.includes(tipo)) {
            return res.status(400).json({
                message:
                    `El campo "tipo" solo puede ser: ${TIPOS_PERMITIDOS.join(', ')}. ` +
                    `Valor recibido: "${tipo}".`,
            });
        }

        // ─── PASO 4: Normalizar el campo "imagenes" ───────────────────────────
        /**
         * "imagenes" es opcional. Si el usuario no seleccionó fotos aún,
         * el campo puede venir undefined, null o como array vacío.
         *
         * Normalizamos siempre a un array para que el documento en Firestore
         * SIEMPRE tenga el campo como array, evitando null-checks en el
         * frontend al intentar hacer imagenes.forEach() o imagenes.map().
         *
         * También filtramos strings vacíos por si el cliente envía URLs
         * mal formadas como artefacto de alguna serialización incorrecta.
         */
        const imagenesNormalizadas = Array.isArray(imagenes)
            ? imagenes.filter((url) => typeof url === 'string' && url.trim() !== '')
            : [];

        // ─── PASO 5: Construir el documento para Firestore ────────────────────
        /**
         * ¿POR QUÉ asociamos el userId al documento del inmueble?
         *
         * El userId en el documento sirve para múltiples propósitos críticos:
         *   1. AUTORÍA:          Saber quién publicó → mostrar en detalle del inmueble
         *   2. AUTORIZACIÓN:     Solo el dueño puede editar/eliminar su publicación
         *   3. QUERIES:          Filtrar por dueño: .where('userId', '==', uid)
         *                        → sección "Mis publicaciones" del perfil
         *   4. NOTIFICACIONES:   Notificar al propietario cuando alguien contacte
         *
         * Sin el userId, el inmueble quedaría "huérfano" en Firestore: sería
         * imposible relacionarlo con su autor después de la inserción.
         *
         * ¿POR QUÉ serverTimestamp() en lugar de new Date()?
         * El reloj del dispositivo cliente puede estar desincronizado.
         * admin.firestore.FieldValue.serverTimestamp() usa el reloj del
         * servidor de Firestore, garantizando timestamps consistentes y
         * comparables entre todos los documentos para ordenar correctamente.
         */
        const propertyData = {
            titulo:      titulo.trim(),
            ubicacion:   ubicacion.trim(),
            descripcion: descripcion.trim(),
            precio:      Number(precio),
            tipo,
            imagenes:    imagenesNormalizadas,
            userId,
            createdAt:   admin.firestore.FieldValue.serverTimestamp(),
        };

        // ─── PASO 6: Persistir el documento en Firestore ──────────────────────
        /**
         * db.collection('properties').add(propertyData):
         *
         * add() vs set():
         *   - add()      → Firebase genera un ID único automáticamente (recomendado)
         *   - set(id, d) → El cliente define el ID manualmente (riesgo de colisión)
         *
         * Usamos add() porque:
         *   - Evita colisiones si dos usuarios publican al mismo tiempo
         *   - Firebase garantiza la unicidad del ID generado (base62, ~20 chars)
         *   - No necesitamos controlar el ID desde el cliente
         *
         * La Promise resuelve con un DocumentReference que expone el .id generado.
         */
        const docRef = await db.collection('properties').add(propertyData);

        // ─── PASO 7: Responder al cliente ─────────────────────────────────────
        /**
         * HTTP 201 Created — Indica que el recurso fue creado exitosamente.
         *
         * Devolvemos el propertyId para que el frontend pueda:
         *   a) Navegar directamente a la pantalla de detalle del inmueble creado
         *   b) Actualizar su cache/lista local sin necesidad de re-fetch completo
         *
         * createdAt se sustituye por new Date().toISOString() porque
         * FieldValue.serverTimestamp() no es serializable a JSON directamente
         * (es un centinela que Firestore resuelve en el servidor).
         */
        return res.status(201).json({
            message:    'Inmueble publicado exitosamente.',
            propertyId: docRef.id,
            property: {
                id: docRef.id,
                ...propertyData,
                createdAt: new Date().toISOString(),
            },
        });

    } catch (error) {
        /**
         * Solo se llega aquí si Firestore falla internamente (timeout, cuota
         * excedida, error de red hacia GCP). Los datos ya fueron validados
         * en los pasos anteriores, por lo que no es un error del cliente.
         */
        console.error('[propertyController] Error al crear propiedad:', error);
        return res.status(500).json({
            message: 'Error interno del servidor al publicar el inmueble. Intenta de nuevo.',
        });
    }
};

/**
 * =============================================================================
 * GET /api/properties — Listar todos los inmuebles
 * =============================================================================
 *
 * Devuelve todos los inmuebles publicados, ordenados por fecha de creación
 * descendente (más recientes primero).
 *
 * No requiere autenticación: el catálogo es público.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const getProperties = async (req, res) => {
    try {
        /**
         * orderBy('createdAt', 'desc') — Los más recientes aparecen primero.
         * Requiere un índice compuesto en Firestore si se combina con where().
         * Para una colección sin where(), Firestore lo maneja sin índice adicional.
         */
        const snapshot = await db
            .collection('properties')
            .orderBy('createdAt', 'desc')
            .get();

        /**
         * snapshot.docs es un array de DocumentSnapshot.
         * Cada doc.data() retorna el objeto con los campos del documento.
         * doc.id es el ID autogenerado por Firestore.
         *
         * Convertimos el Timestamp de Firestore a ISO string porque el
         * tipo Timestamp no es serializable a JSON de forma legible.
         */
        const properties = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
        }));

        return res.json(properties);
    } catch (error) {
        console.error('[propertyController] Error al obtener propiedades:', error);
        return res.status(500).json({ message: 'Error al obtener los inmuebles.' });
    }
};

/**
 * =============================================================================
 * GET /api/properties/user/:userId — Inmuebles publicados por un usuario
 * =============================================================================
 *
 * Filtra los inmuebles cuyo campo "userId" coincide con el parámetro de ruta.
 * Usado en la sección "Mis publicaciones" del perfil del usuario.
 *
 * @param {import('express').Request}  req  — req.params.userId (Firebase UID)
 * @param {import('express').Response} res
 */
export const getPropertiesByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidFirebaseUid(userId)) {
            return res.status(400).json({
                message:
                    'El userId no es un UID de Firebase válido ' +
                    '(alfanumérico, 20-128 caracteres).',
            });
        }

        /**
         * .where('userId', '==', userId) — Query de igualdad en Firestore.
         * Firestore crea índices automáticos para queries de igualdad simples,
         * por lo que esta query no requiere configuración adicional.
         */
        const snapshot = await db
            .collection('properties')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const properties = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
        }));

        return res.json(properties);
    } catch (error) {
        console.error('[propertyController] Error al obtener propiedades por usuario:', error);
        return res.status(500).json({ message: 'Error al obtener los inmuebles del usuario.' });
    }
};