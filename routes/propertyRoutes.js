import express from 'express';
import {
    createProperty,
    getProperties,
    getPropertiesByUser,
} from '../controllers/propertyController.js';

/**
 * =============================================================================
 * Router de Propiedades/Inmuebles (propertyRoutes.js)
 * =============================================================================
 *
 * PREFIJO BASE: /api/properties  (registrado en index.js)
 *
 * ¿POR QUÉ separar las rutas en un archivo por recurso?
 * ──────────────────────────────────────────────────────
 * El patrón Router de Express divide las rutas en módulos independientes,
 * uno por recurso (users, services, reviews, properties). Esto:
 *   1. Reduce el acoplamiento: cambios aquí no afectan otras rutas
 *   2. Mejora la legibilidad: al abrir este archivo, se ven todos los
 *      endpoints disponibles para "properties" de un vistazo
 *   3. Facilita el testing: cada router puede testearse de forma aislada
 *   4. Permite escalar: añadir un endpoint nuevo no requiere tocar index.js
 *
 * TABLA DE ENDPOINTS:
 * ┌──────────┬───────────────────────────────┬─────────────────────────────┐
 * │  Método  │  Ruta completa                │  Descripción                │
 * ├──────────┼───────────────────────────────┼─────────────────────────────┤
 * │  GET     │  /api/properties              │  Listar todos los inmuebles │
 * │  POST    │  /api/properties              │  Publicar nuevo inmueble    │
 * │  GET     │  /api/properties/user/:userId │  Inmuebles de un usuario    │
 * └──────────┴───────────────────────────────┴─────────────────────────────┘
 *
 * @see controllers/propertyController.js — Lógica de cada handler
 * @see index.js — Registro del router bajo el prefijo /api/properties
 */

const router = express.Router();

// ─── GET /api/properties ──────────────────────────────────────────────────────
/**
 * Lista todos los inmuebles publicados en la plataforma.
 *
 * Acceso público: no requiere autenticación. El catálogo de inmuebles
 * es visible para cualquier visitante (incluso sin cuenta).
 *
 * Respuesta: Array<Property> ordenado por createdAt descendente.
 */
router.get('/', getProperties);

// ─── POST /api/properties ─────────────────────────────────────────────────────
/**
 * Publica un nuevo inmueble. Requiere usuario autenticado.
 *
 * AUTENTICACIÓN:
 * El Firebase UID del usuario debe enviarse en:
 *   - req.body.userId         (campo JSON en el body)
 *   - header "x-user-id"      (header HTTP alternativo)
 * Este patrón es consistente con POST /api/reviews y PATCH /api/users/fcm-token.
 *
 * BODY ESPERADO (Content-Type: application/json):
 * {
 *   "userId":      string    — Firebase UID del propietario        [requerido]
 *   "titulo":      string    — Título descriptivo del inmueble     [requerido]
 *   "ubicacion":   string    — Dirección o zona geográfica         [requerido]
 *   "descripcion": string    — Descripción detallada               [requerido]
 *   "precio":      number    — Precio en COP (>= 0)                [requerido]
 *   "tipo":        string    — "Arriendo" | "Venta"                [requerido]
 *   "imagenes":    string[]  — URLs de fotos en Firebase Storage   [opcional]
 * }
 *
 * CÓDIGOS DE RESPUESTA:
 *   201 Created      — Inmueble creado. Body: { propertyId, property }
 *   400 Bad Request  — Campo obligatorio faltante o "tipo" inválido
 *   401 Unauthorized — userId ausente o con formato inválido
 *   500 Internal     — Error de Firestore
 *
 * ¿POR QUÉ las imágenes llegan como URLs y no como archivos binarios?
 * ──────────────────────────────────────────────────────────────────
 * La app Android sube las fotos DIRECTAMENTE a Firebase Storage usando el
 * SDK cliente. Firebase retorna una URL de descarga pública. Solo esa URL
 * se envía al backend. Este es el patrón "client-side upload":
 *   VENTAJAS:
 *     - El backend no procesa binarios (evita multipart/form-data)
 *     - Las imágenes no pasan por nuestros servidores (menor latencia y costo)
 *     - Firebase Storage tiene CDN global incorporada
 *   CONSIDERACIÓN:
 *     - El backend no puede verificar que las URLs apunten a imágenes válidas,
 *       pero esto es aceptable para un proyecto académico.
 */
router.post('/', createProperty);

// ─── GET /api/properties/user/:userId ─────────────────────────────────────────
/**
 * Obtiene todos los inmuebles publicados por un usuario específico.
 *
 * Usado en la sección "Mis publicaciones" del perfil del usuario.
 *
 * PARÁMETROS DE RUTA:
 *   :userId — Firebase UID del usuario propietario (string alfanumérico 20-128 chars)
 *
 * RESPUESTA:
 *   200 OK  — Array<Property> (puede ser vacío si el usuario no tiene publicaciones)
 *   400     — :userId con formato inválido
 *   500     — Error de Firestore
 *
 * ⚠️ ORDEN DE REGISTRO IMPORTANTE:
 * Esta ruta DEBE estar registrada ANTES de cualquier ruta dinámica '/:id'
 * (si se añade en el futuro). Express evalúa rutas en orden de registro:
 * si '/:id' fuera primero, 'user' sería interpretado como un ID,
 * y esta ruta nunca sería alcanzada.
 */
router.get('/user/:userId', getPropertiesByUser);

export default router;
