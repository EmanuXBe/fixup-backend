import User from './models/User.js';
import Service from './models/Service.js';
import Review from './models/Review.js';

/**
 * =============================================================================
 * Datos Iniciales / Seed Data
 * =============================================================================
 *
 * PROPÓSITO:
 * Carga datos de prueba en la base de datos cuando las tablas están vacías.
 * Se ejecuta después de sequelize.sync({ force: true }) en index.js.
 *
 * DECISIÓN DE DISEÑO — Firebase UIDs simulados:
 * ──────────────────────────────────────────────
 * Los IDs de los usuarios son strings alfanuméricos que simulan Firebase UIDs
 * reales. Esto es necesario porque:
 *   1. El modelo User.id es de tipo STRING (no INTEGER autoIncrement)
 *   2. La validación isValidFirebaseUid() requiere >= 20 caracteres alfanuméricos
 *   3. Los user_id en las reseñas deben coincidir exactamente con estos IDs
 *
 * En producción, estos IDs serían los UIDs reales generados por Firebase Auth
 * al registrar usuarios. Para testing y desarrollo, usamos strings que cumplen
 * el formato pero son legibles (prefijados con 'firebase_uid_user_').
 *
 * NOTA: profileImage usa URLs de placeholder (ui-avatars.com) para simular
 * las fotos de perfil que en producción vendrían de Firebase Storage o
 * del proveedor OAuth (Google, Facebook, etc.).
 *
 * @see index.js — Invocación de loadInitialData()
 * @see models/User.js — Modelo que requiere id STRING de >= 20 chars
 */

/**
 * 8 usuarios de prueba con IDs que simulan Firebase UIDs.
 * Cada ID tiene exactamente 28 caracteres alfanuméricos (longitud típica de Firebase).
 */
const initialUsers = [
    {
        id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ01',
        username: 'juan_perez',
        email: 'juan@example.com',
        profileImage: 'https://ui-avatars.com/api/?name=Juan+Perez&background=random',
    },
    {
        id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ02',
        username: 'maria_garcia',
        email: 'maria@example.com',
        profileImage: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=random',
    },
    {
        id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ03',
        username: 'carlos_lopez',
        email: 'carlos@example.com',
        profileImage: 'https://ui-avatars.com/api/?name=Carlos+Lopez&background=random',
    },
    {
        id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ04',
        username: 'ana_martinez',
        email: 'ana@example.com',
        profileImage: 'https://ui-avatars.com/api/?name=Ana+Martinez&background=random',
    },
    {
        id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ05',
        username: 'pedro_sanchez',
        email: 'pedro@example.com',
        profileImage: 'https://ui-avatars.com/api/?name=Pedro+Sanchez&background=random',
    },
    {
        id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ06',
        username: 'lucia_fernandez',
        email: 'lucia@example.com',
        profileImage: null, // Usuario sin foto de perfil — el frontend muestra avatar genérico
    },
    {
        id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ07',
        username: 'diego_ramirez',
        email: 'diego@example.com',
        profileImage: 'https://ui-avatars.com/api/?name=Diego+Ramirez&background=random',
    },
    {
        id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ08',
        username: 'sofia_torres',
        email: 'sofia@example.com',
        profileImage: 'https://ui-avatars.com/api/?name=Sofia+Torres&background=random',
    },
];

/**
 * 5 servicios de renovación/reparación que los usuarios pueden reseñar.
 * Estos mantienen IDs autoincrementales (INTEGER) porque no son entidades
 * gestionadas por Firebase.
 */
const initialServices = [
    {
        title: 'Kitchen Remodel',
        description: 'Complete cabinet, countertop and lighting renovation.',
        image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
        categoria: 'Kitchen',
    },
    {
        title: 'Interior Painting',
        description: 'Professional painting service for all rooms.',
        image_url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800',
        categoria: 'Walls',
    },
    {
        title: 'Flooring Installation',
        description: 'Wood, laminate or tile flooring installation.',
        image_url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800',
        categoria: 'Floors',
    },
    {
        title: 'Bathroom Remodel',
        description: 'Upgrade of fixtures, tiles and faucets.',
        image_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800',
        categoria: 'Bathroom',
    },
    {
        title: 'General Electrical',
        description: 'Inspection and upgrade of electrical systems.',
        image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
        categoria: 'Electrical',
    },
];

/**
 * 10 reseñas distribuidas entre diferentes usuarios y servicios.
 *
 * IMPORTANTE: Los valores de user_id deben coincidir EXACTAMENTE con los
 * IDs definidos en initialUsers. Cualquier discrepancia causaría un error
 * de FK (foreign key constraint violation) en PostgreSQL porque la relación
 * Review.belongsTo(User) con onDelete: CASCADE exige que el user_id
 * referenciado exista en la tabla Users.
 */
const initialReviews = [
    { rating: 5, comment: 'Excelente trabajo en la cocina, quedó como nueva.',                   user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ01', service_id: 1 },
    { rating: 4, comment: 'Buena pintura, pero tardaron un poco más de lo esperado.',             user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ02', service_id: 2 },
    { rating: 5, comment: 'El piso de madera quedó espectacular, muy profesionales.',             user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ03', service_id: 3 },
    { rating: 3, comment: 'El baño quedó bien, pero hubo algunos detalles menores.',              user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ04', service_id: 4 },
    { rating: 5, comment: 'Servicio eléctrico rápido y seguro, muy recomendado.',                 user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ05', service_id: 5 },
    { rating: 4, comment: 'Remodelación de cocina con buenos acabados y materiales.',             user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ06', service_id: 1 },
    { rating: 2, comment: 'La pintura se descascaró al poco tiempo, decepcionante.',              user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ07', service_id: 2 },
    { rating: 5, comment: 'Instalación de pisos impecable, cero quejas.',                        user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ08', service_id: 3 },
    { rating: 4, comment: 'Buen trabajo en el baño, relación calidad-precio justa.',              user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ01', service_id: 4 },
    { rating: 5, comment: 'Resolvieron un problema eléctrico complejo en pocas horas.',           user_id: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ03', service_id: 5 },
];

/**
 * loadInitialData()
 * ─────────────────
 * Carga los datos seed solo si las tablas están vacías.
 * Se usa .count() antes de .bulkCreate() para evitar duplicados
 * en caso de que la función se invoque múltiples veces.
 *
 * ORDEN DE INSERCIÓN:
 * 1. Users primero (porque Reviews depende de User.id via FK)
 * 2. Services segundo (porque Reviews depende de Service.id via FK)
 * 3. Reviews al final (tiene FKs a ambas tablas anteriores)
 *
 * Si se invirtiera el orden, PostgreSQL rechazaría la inserción de Reviews
 * con un error de foreign key constraint violation.
 */
export const loadInitialData = async () => {
    try {
        const userCount = await User.count();
        const serviceCount = await Service.count();
        const reviewCount = await Review.count();

        if (userCount === 0) {
            await User.bulkCreate(initialUsers);
            console.log('✅ Datos iniciales de usuarios cargados (8 usuarios con Firebase UIDs).');
        }

        if (serviceCount === 0) {
            await Service.bulkCreate(initialServices);
            console.log('✅ Datos iniciales de servicios cargados (5 servicios).');
        }

        if (reviewCount === 0) {
            await Review.bulkCreate(initialReviews);
            console.log('✅ Datos iniciales de reseñas cargados (10 reseñas).');
        }
    } catch (error) {
        console.error('❌ Error al cargar datos iniciales:', error);
    }
};
