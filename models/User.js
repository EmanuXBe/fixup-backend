import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

/**
 * =============================================================================
 * Modelo de Usuario (User)
 * =============================================================================
 *
 * DECISIÓN ARQUITECTURAL — Firebase como proveedor de identidad:
 * ---------------------------------------------------------------
 * En esta aplicación, la autenticación se delega completamente a Firebase Auth.
 * Esto significa que Firebase genera y administra los UIDs de los usuarios,
 * los cuales son strings alfanuméricos de ~28 caracteres (ej: "aBcDeFgH123...").
 *
 * CONSECUENCIA EN EL DISEÑO DE BASE DE DATOS:
 * - La clave primaria (id) DEBE ser de tipo STRING, NO INTEGER autoincremental.
 *   Usar INTEGER causaría que PostgreSQL no pueda almacenar los UIDs de Firebase,
 *   rompiendo todas las queries que filtren por user_id.
 * - No almacenamos contraseñas localmente. Firebase maneja toda la autenticación
 *   (email/password, Google Sign-In, etc.), por lo que guardar un campo `password`
 *   en nuestra BD sería redundante y un riesgo de seguridad.
 *
 * RELACIONES:
 * - User tiene una relación 1:N con Review (un usuario puede escribir muchas reseñas).
 * - La FK en Review (user_id) referencia este id de tipo STRING.
 * - Las relaciones se definen en models/relations.js para mantener la separación
 *   de responsabilidades y evitar dependencias circulares entre modelos.
 *
 * @see models/relations.js — Configuración de asociaciones Sequelize
 * @see controllers/reviewController.js — Uso del User include en queries de reseñas
 */
const User = sequelize.define('User', {
    /**
     * Clave primaria: Firebase UID.
     * ─────────────────────────────
     * - Tipo STRING porque Firebase genera UIDs alfanuméricos (no enteros).
     * - autoIncrement se ELIMINA: Firebase asigna los IDs externamente.
     * - allowNull: false es implícito para primaryKey en Sequelize, pero lo
     *   dejamos explícito por claridad y para que sea evidente en la sustentación.
     * - Se valida longitud mínima (20) y máxima (128) para prevenir:
     *   · UIDs vacíos o truncados que pasarían la validación de allowNull
     *   · Inyección de strings arbitrariamente largos que podrían causar
     *     problemas de rendimiento en índices.
     *   · Firebase UIDs típicamente tienen ~28 chars, pero dejamos margen
     *     para compatibilidad con otros proveedores de identidad.
     */
    id: {
        type: DataTypes.STRING(128),
        primaryKey: true,
        allowNull: false,
        validate: {
            len: {
                args: [20, 128],
                msg: 'El UID de Firebase debe tener entre 20 y 128 caracteres',
            },
        },
    },

    /**
     * Nombre de usuario visible en la plataforma.
     * Se muestra como el "autor" de las reseñas en el frontend.
     * allowNull: false garantiza que todo usuario registrado tenga un nombre
     * visible para la comunidad.
     */
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    /**
     * Correo electrónico del usuario.
     * ─────────────────────────────
     * - unique: true previene registros duplicados a nivel de base de datos.
     *   Esto es una segunda línea de defensa: Firebase ya valida unicidad de
     *   email, pero la constraint en BD protege contra inconsistencias si
     *   se insertan datos directamente (seeds, migraciones, etc.).
     * - allowNull: false porque el email es requerido para la cuenta Firebase.
     */
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },

    /**
     * URL de la foto de perfil del usuario.
     * ─────────────────────────────────────
     * - Puede ser la photoURL provista por Firebase Auth (Google, Facebook, etc.)
     *   o una URL custom subida por el usuario.
     * - allowNull: true (por defecto) porque un usuario puede no tener foto;
     *   en ese caso el frontend mostrará un avatar genérico.
     * - Se incluye en los queries de reseñas (via include) para que el frontend
     *   pueda mostrar la foto del autor junto a cada reseña sin hacer
     *   peticiones adicionales (optimización N+1).
     */
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
}, {
    /**
     * timestamps: false — Decisión de diseño:
     * No necesitamos createdAt/updatedAt a nivel de Sequelize porque Firebase
     * ya mantiene metadata de creación del usuario. Si en el futuro se necesitan,
     * se pueden habilitar sin migración destructiva (Sequelize los agrega
     * automáticamente con ALTER TABLE).
     */
    timestamps: false,
});

export default User;
