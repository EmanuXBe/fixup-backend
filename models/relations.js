import { DataTypes } from 'sequelize';
import User from './User.js';
import Service from './Service.js';
import Review from './Review.js';

/**
 * =============================================================================
 * Configuración de Relaciones / Asociaciones entre Modelos (Sequelize)
 * =============================================================================
 *
 * ARQUITECTURA DE RELACIONES:
 * ───────────────────────────
 * Este archivo centraliza TODAS las asociaciones entre modelos de Sequelize.
 * Se separan de las definiciones de modelos individuales por tres razones:
 *
 *   1. EVITAR DEPENDENCIAS CIRCULARES:
 *      Si User.js importara Review.js para definir hasMany, y Review.js
 *      importara User.js para definir belongsTo, Node.js entraría en un
 *      ciclo de importación que resultaría en `undefined` para uno de los
 *      módulos. Al centralizar aquí, cada modelo se importa una sola vez
 *      sin ciclos.
 *
 *   2. VISIÓN COMPLETA DEL ESQUEMA:
 *      Un desarrollador puede abrir este único archivo para entender
 *      todo el grafo de relaciones de la base de datos, sin tener que
 *      navegar entre múltiples archivos de modelos.
 *
 *   3. ORDEN DE EJECUCIÓN CONTROLADO:
 *      setRelations() se invoca en index.js ANTES de sequelize.sync(),
 *      garantizando que las asociaciones están registradas cuando Sequelize
 *      genera el DDL (CREATE TABLE con las FKs correctas).
 *
 * DIAGRAMA DE RELACIONES:
 * ┌──────────┐    1:N    ┌──────────┐    N:1    ┌──────────┐
 * │   User   │──────────▶│  Review  │◀──────────│ Service  │
 * │(Firebase)│           │          │           │          │
 * └──────────┘           └──────────┘           └──────────┘
 *   PK: STRING            FK: user_id (STRING)    PK: INTEGER
 *   (UID Firebase)        FK: service_id (INT)
 *
 * @see index.js — Punto donde se invoca setRelations()
 * @see models/User.js — Modelo de usuario con PK tipo STRING (Firebase UID)
 * @see models/Review.js — Modelo de reseña con FKs explícitas
 * @see models/Service.js — Modelo de servicio con PK autoincremental
 */
const setRelations = () => {

    /**
     * =========================================================================
     * Relación User ↔ Review (1:N)
     * =========================================================================
     *
     * SEMÁNTICA: Un usuario puede escribir muchas reseñas; cada reseña
     * pertenece a exactamente un usuario (su autor).
     *
     * CONFIGURACIÓN DE LA FOREIGN KEY:
     * - foreignKey: 'user_id' → Nombre de la columna en la tabla Reviews
     *   que referencia al usuario autor.
     * - type: DataTypes.STRING → CRÍTICO: debe coincidir con el tipo de
     *   User.id (STRING). Si se omite, Sequelize inferiría INTEGER por
     *   defecto, causando un error de tipo en PostgreSQL al hacer JOINs.
     * - allowNull: false → Toda reseña DEBE tener un autor. Una reseña
     *   sin usuario sería datos huérfanos sin valor para la plataforma.
     *
     * ON DELETE CASCADE:
     * Si se elimina un usuario de la base de datos, todas sus reseñas se
     * eliminan automáticamente. Esto mantiene la integridad referencial
     * y evita reseñas "fantasma" sin autor. Es la política estándar para
     * relaciones de contenido generado por usuario (UGC).
     *
     * ON UPDATE CASCADE:
     * Si por algún motivo el UID de un usuario cambia (improbable con
     * Firebase, pero posible en migraciones), las FKs en Review se
     * actualizan automáticamente.
     */
    User.hasMany(Review, {
        foreignKey: {
            name: 'user_id',
            type: DataTypes.STRING(128),
            allowNull: false,
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    Review.belongsTo(User, {
        foreignKey: {
            name: 'user_id',
            type: DataTypes.STRING(128),
            allowNull: false,
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    /**
     * =========================================================================
     * Relación Service ↔ Review (1:N)
     * =========================================================================
     *
     * SEMÁNTICA: Un servicio puede recibir muchas reseñas; cada reseña
     * se refiere a exactamente un servicio.
     *
     * A diferencia de User, Service.id es INTEGER autoIncrement, por lo
     * que la FK service_id se deja como INTEGER (el default de Sequelize).
     *
     * ON DELETE CASCADE:
     * Si se elimina un servicio, sus reseñas pierden contexto y deben
     * eliminarse. El frontend no puede mostrar una reseña de un servicio
     * que ya no existe.
     */
    Service.hasMany(Review, {
        foreignKey: {
            name: 'service_id',
            allowNull: false,
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    Review.belongsTo(Service, {
        foreignKey: {
            name: 'service_id',
            allowNull: false,
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
};

export default setRelations;
