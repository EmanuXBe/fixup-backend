import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

/**
 * =============================================================================
 * Modelo de Reseña (Review)
 * =============================================================================
 *
 * PROPÓSITO EN LA ARQUITECTURA:
 * Representa la entidad central del dominio de FixUp: las reseñas que los
 * usuarios escriben sobre los servicios/propiedades de la plataforma.
 *
 * DISEÑO DE CLAVES FORÁNEAS:
 * ─────────────────────────
 * - user_id (STRING): Referencia al Firebase UID del autor de la reseña.
 *   Se declara STRING porque User.id es un UID de Firebase (alfanumérico).
 *   Si se dejara como INTEGER (el default de Sequelize para FKs), PostgreSQL
 *   lanzaría un error de tipo al intentar hacer JOIN entre Review.user_id
 *   (INTEGER) y User.id (STRING).
 *
 * - service_id (INTEGER): Referencia al servicio reseñado.
 *   Se mantiene INTEGER porque Service.id sí usa autoIncrement.
 *
 * NOTA: Aunque las relaciones se definen en relations.js, declaramos
 * explícitamente las FKs aquí para que:
 *   1. La tabla se cree con los tipos correctos desde el primer sync()
 *   2. El código sea auto-documentado (se ve la FK sin ir a otro archivo)
 *   3. Se puedan agregar validaciones específicas a nivel de columna
 *
 * RELACIONES (definidas en models/relations.js):
 * - Review.belongsTo(User)  → Un review pertenece a un usuario (autor)
 * - Review.belongsTo(Service) → Un review pertenece a un servicio
 *
 * @see models/relations.js — Asociaciones Sequelize
 * @see controllers/reviewController.js — CRUD de reseñas
 */
const Review = sequelize.define('Review', {
    /**
     * Clave primaria autoincrementable.
     * A diferencia de User.id, las reseñas SÍ usan INTEGER autoIncrement
     * porque son entidades generadas internamente (no por Firebase).
     */
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },

    /**
     * Calificación numérica del servicio (0 a 5 estrellas).
     * ─────────────────────────────────────────────────────
     * - allowNull: false → Toda reseña DEBE tener una calificación.
     *   Una reseña sin rating no tiene sentido en el dominio del negocio.
     * - validate.min/max → Restricción a nivel de aplicación que complementa
     *   la restricción a nivel de BD. Esto atrapa valores inválidos ANTES
     *   de enviar el query a PostgreSQL, proporcionando mensajes de error
     *   más descriptivos al frontend.
     */
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
            max: 5,
        },
    },

    /**
     * Texto libre de la reseña.
     * DataTypes.TEXT permite contenido de longitud variable sin el límite
     * de 255 caracteres que impone STRING. Esto es importante para reseñas
     * detalladas que el usuario quiera escribir.
     * allowNull es true por defecto: una reseña puede ser solo una calificación
     * sin comentario (patrón común en apps de reseñas).
     */
    comment: {
        type: DataTypes.TEXT,
    },

    /**
     * Fecha de creación de la reseña.
     * defaultValue: DataTypes.NOW automatiza la asignación de la fecha,
     * evitando que el frontend tenga que enviarla (fuente única de verdad
     * en el servidor, no en el cliente).
     */
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },

    /**
     * FK al autor de la reseña (Firebase UID).
     * ─────────────────────────────────────────
     * CRÍTICO: Debe ser STRING para coincidir con User.id.
     * Si se omite esta declaración explícita, Sequelize inferiría el tipo
     * de la relación en relations.js, pero declararlo aquí garantiza que
     * la columna se crea con el tipo correcto en el primer sync(),
     * independientemente del orden de ejecución.
     */
    user_id: {
        type: DataTypes.STRING(128),
        allowNull: false,
    },

    /**
     * FK al servicio reseñado.
     * INTEGER porque Service.id es autoIncrement INTEGER.
     */
    service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    /**
     * timestamps: false — Usamos nuestro propio campo `date` en vez de
     * createdAt/updatedAt de Sequelize para mantener control explícito
     * sobre el formato y la semántica del campo de fecha.
     */
    timestamps: false,
});

export default Review;
