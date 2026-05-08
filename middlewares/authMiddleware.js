import admin from '../config/firebase.js';

/**
 * Middleware de Autenticación con Firebase
 * ───────────────────────────────────────
 *
 * RESPONSABILIDAD:
 * Este middleware intercepta las peticiones entrantes y valida el ID Token (JWT)
 * enviado por el cliente en el header 'Authorization'.
 *
 * FLUJO DE VALIDACIÓN:
 * 1. Verifica la existencia del header Authorization.
 * 2. Extrae el token (formato "Bearer <token>").
 * 3. Valida el token contra Firebase Admin SDK.
 * 4. Si es válido, inyecta los datos del usuario (uid, email, etc.) en req.user.
 * 5. Si es inválido, retorna 401 o 403 según corresponda.
 *
 * @param {Object} req — Solicitud Express
 * @param {Object} res — Respuesta Express
 * @param {Function} next — Siguiente middleware/handler
 */
export const validateFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'error',
            message: 'No se proporcionó un token de autenticación. Se requiere el header Authorization: Bearer <token>',
        });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        /**
         * verifyIdToken(idToken)
         * - Verifica la firma del JWT.
         * - Verifica que no haya expirado.
         * - Verifica que el emisor (iss) sea el correcto de Firebase.
         */
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Inyectamos el usuario decodificado en la request para uso de los controllers
        req.user = decodedToken;
        
        next();
    } catch (error) {
        console.error('Error al verificar Firebase ID Token:', error.message);
        
        // Errores específicos de Firebase Auth
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                status: 'error',
                message: 'El token de sesión ha expirado. Por favor, inicia sesión de nuevo.',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.code === 'auth/argument-error') {
            return res.status(401).json({
                status: 'error',
                message: 'El token proporcionado tiene un formato inválido.',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        return res.status(403).json({
            status: 'error',
            message: 'No tienes autorización para acceder a este recurso.',
            code: 'UNAUTHORIZED_ACCESS'
        });
    }
};
