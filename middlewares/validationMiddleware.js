import { AppError } from './errorMiddleware.js';

/**
 * Validadores Reutilizables
 * ────────────────────────
 */

/**
 * Valida el formato de un Firebase UID.
 * @param {string} uid 
 * @throws {AppError} si el formato es inválido
 */
export const validateFirebaseUid = (uid) => {
    if (!uid || typeof uid !== 'string') {
        throw new AppError('El ID de usuario es requerido y debe ser una cadena.', 400, 'INVALID_UID');
    }
    
    if (uid.length < 20 || uid.length > 128 || !/^[a-zA-Z0-9]+$/.test(uid)) {
        throw new AppError(
            'El ID proporcionado no es un UID de Firebase válido (debe ser alfanumérico y tener entre 20 y 128 caracteres).',
            400,
            'INVALID_UID_FORMAT'
        );
    }
    
    return true;
};

/**
 * Middleware para validar que el body contenga campos requeridos.
 * @param {string[]} fields 
 */
export const requireFields = (fields) => (req, res, next) => {
    const missingFields = fields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return next(new AppError(
            `Los siguientes campos son obligatorios: ${missingFields.join(', ')}`,
            400,
            'MISSING_FIELDS'
        ));
    }
    
    next();
};
