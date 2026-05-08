/**
 * Middleware Centralizado de Manejo de Errores
 * ───────────────────────────────────────────
 *
 * RESPONSABILIDAD:
 * Capturar cualquier error lanzado en la cadena de middlewares o controladores
 * y devolver una respuesta JSON estandarizada. Esto evita fugas de información
 * (stack traces) en producción y garantiza una experiencia consistente para el frontend.
 *
 * TIPOS DE ERRORES MANEJADOS:
 * 1. Sequelize errors (Validation, UniqueConstraint, ForeignKeyConstraint).
 * 2. Errores personalizados con statusCode.
 * 3. Errores genéricos (500).
 */
export const errorHandler = (err, req, res, next) => {
    console.error(' [ERROR LOG] ->', {
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
        path: req.path,
        method: req.method
    });

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Error interno del servidor';
    let code = err.code || 'INTERNAL_SERVER_ERROR';

    // Manejo de errores específicos de Sequelize
    if (err.name === 'SequelizeValidationError') {
        statusCode = 400;
        message = 'Datos de entrada inválidos: ' + err.errors.map(e => e.message).join(', ');
        code = 'VALIDATION_ERROR';
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 409;
        message = 'El recurso ya existe o el campo debe ser único.';
        code = 'CONFLICT_ERROR';
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
        statusCode = 400;
        message = 'Error de referencia: el recurso relacionado no existe.';
        code = 'FOREIGN_KEY_ERROR';
    }

    res.status(statusCode).json({
        status: 'error',
        message,
        code,
        // Solo incluimos detalles adicionales en desarrollo
        details: process.env.NODE_ENV === 'production' ? null : err.errors || null
    });
};

/**
 * Clase de Error Personalizada
 * Para lanzar errores controlados desde los controllers.
 */
export class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
