import { db } from '../config/firebase.js';
import admin from '../config/firebase.js';
import { AppError } from '../middlewares/errorMiddleware.js';
import { validateFirebaseUid } from '../middlewares/validationMiddleware.js';

// =============================================================================
// HELPERS PRIVADOS
// =============================================================================

const resolveRequestUserId = (req) =>
    req.user?.uid ?? req.body?.userId ?? req.headers['x-user-id'] ?? null;

const TIPOS_PERMITIDOS = ['Arriendo', 'Venta'];

// =============================================================================
// CONTROLADORES
// =============================================================================

/**
 * POST /api/properties — Publicar un nuevo inmueble
 */
export const createProperty = async (req, res, next) => {
    try {
        const userId = resolveRequestUserId(req);

        if (!userId) {
            throw new AppError('Se requiere autenticación.', 401, 'UNAUTHORIZED');
        }

        validateFirebaseUid(userId);

        const { titulo, ubicacion, descripcion, precio, tipo, imagenes } = req.body;

        if (!titulo || !ubicacion || !descripcion || precio == null || !tipo) {
            throw new AppError('Todos los campos son obligatorios.', 400, 'MISSING_FIELDS');
        }

        if (!TIPOS_PERMITIDOS.includes(tipo)) {
            throw new AppError(`Tipo inválido. Permitidos: ${TIPOS_PERMITIDOS.join(', ')}`, 400, 'INVALID_TYPE');
        }

        const imagenesNormalizadas = Array.isArray(imagenes)
            ? imagenes.filter((url) => typeof url === 'string' && url.trim() !== '')
            : [];

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

        const docRef = await db.collection('properties').add(propertyData);

        return res.status(201).json({
            status: 'success',
            message:    'Inmueble publicado exitosamente.',
            propertyId: docRef.id,
            property: {
                id: docRef.id,
                ...propertyData,
                createdAt: new Date().toISOString(),
            },
        });

    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/properties — Listar todos los inmuebles
 */
export const getProperties = async (req, res, next) => {
    try {
        const snapshot = await db
            .collection('properties')
            .orderBy('createdAt', 'desc')
            .get();

        const properties = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
        }));

        return res.json(properties);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/properties/user/:userId — Inmuebles publicados por un usuario
 */
export const getPropertiesByUser = async (req, res, next) => {
    try {
        const { userId } = req.params;

        validateFirebaseUid(userId);

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
        next(error);
    }
};