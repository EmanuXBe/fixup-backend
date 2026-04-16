import express from 'express';
import cors from 'cors';
import sequelize from './database/database.js';
import setRelations from './models/relations.js';
import { loadInitialData } from './initData.js';

import userRoutes from './routes/userRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

/**
 * =============================================================================
 * Punto de Entrada de la Aplicación (index.js)
 * =============================================================================
 *
 * ARQUITECTURA:
 * Este archivo orquesta el arranque de toda la API REST de FixUp:
 *   1. Configura los middlewares de Express (CORS, JSON parsing)
 *   2. Registra las rutas de la API
 *   3. Establece las relaciones de Sequelize
 *   4. Sincroniza la base de datos
 *   5. Carga datos iniciales (solo si las tablas están vacías)
 *   6. Inicia el servidor HTTP
 *
 * SEPARACIÓN DE ENTORNOS:
 * El comportamiento varía según NODE_ENV ('production' vs 'development'):
 *   - CORS: Restringido en producción, permisivo en desarrollo
 *   - Sequelize sync: ALTER en producción, FORCE en desarrollo
 *   - Puerto: Dinámico via process.env.PORT en producción
 *
 * @see database/database.js — Configuración de conexión PostgreSQL
 * @see models/relations.js — Asociaciones entre modelos Sequelize
 */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Detección de entorno
 * ─────────────────────────────────────────────────────────────────────────────
 * Render establece NODE_ENV='production' automáticamente.
 * En local, si no se define, asumimos 'development'.
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Instancia de Express
 * ─────────────────────────────────────────────────────────────────────────────
 */
const app = express();

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Puerto del servidor
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RENDER Y EL PUERTO:
 * Render asigna dinámicamente un puerto a cada servicio web y lo expone
 * en la variable de entorno PORT. El servidor DEBE escuchar en ese puerto
 * exacto, no en uno hardcodeado.
 *
 * Si se usa un puerto distinto (ej: 3000 hardcoded), Render detecta que
 * el servicio no responde en el puerto asignado y lo marca como "unhealthy",
 * reiniciándolo indefinidamente.
 *
 * FALLBACK A 3000:
 * En desarrollo local, PORT normalmente no está definida, así que
 * usamos 3000 como puerto por defecto. Esto es solo una convención;
 * cualquier puerto libre funciona.
 */
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARES
// =============================================================================

/**
 * CORS (Cross-Origin Resource Sharing):
 * ─────────────────────────────────────
 * Controla qué dominios pueden hacer peticiones a esta API.
 *
 * ¿POR QUÉ ES NECESARIO?
 * Los navegadores web bloquean por defecto las peticiones HTTP desde un
 * dominio (ej: el frontend en fixup-app.com) hacia otro dominio (ej: la
 * API en fixup-api.onrender.com). CORS es el mecanismo estándar HTTP
 * para permitir explícitamente estas peticiones cross-origin.
 *
 * NOTA: Las apps móviles nativas (Flutter, React Native, Swift) NO están
 * sujetas a la política CORS del navegador, pero configurarlo correctamente
 * es una buena práctica por si se añade un frontend web en el futuro.
 *
 * CONFIGURACIÓN POR ENTORNO:
 *
 * PRODUCCIÓN:
 *   - origin: Lista blanca de dominios autorizados. Solo los frontends
 *     desplegados en estos dominios pueden consumir la API.
 *   - Se incluye el dominio de Render (.onrender.com) donde estaría
 *     desplegado un frontend web, si existiera.
 *   - Se puede agregar dominios custom cuando se configure un dominio propio.
 *
 * DESARROLLO:
 *   - origin: '*' (wildcard) permite cualquier origen. Esto es aceptable
 *     SOLO en desarrollo porque simplifica las pruebas desde múltiples
 *     herramientas (Postman, navegador, emulador móvil, etc.).
 *   - NUNCA usar origin: '*' en producción. Un atacante podría crear
 *     un sitio malicioso que haga peticiones a tu API desde el navegador
 *     de un usuario autenticado (ataque CSRF).
 */
const corsOptions = isProduction
    ? {
        origin: [
            /**
             * Agrega aquí los dominios exactos de tus frontends desplegados.
             * Ejemplo: 'https://fixup-frontend.onrender.com'
             * Puedes agregar múltiples orígenes al array.
             */
            process.env.FRONTEND_URL,
        ].filter(Boolean), // filter(Boolean) elimina valores undefined/null si FRONTEND_URL no está definida
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    }
    : {
        origin: '*',
    };

app.use(cors(corsOptions));

/**
 * express.json():
 * Middleware que parsea el body de las peticiones con Content-Type: application/json.
 * Sin esto, req.body sería undefined para todas las peticiones POST/PUT.
 *
 * limit: '10mb' — Limita el tamaño máximo del body a 10 MB.
 * Sin este límite, un atacante podría enviar payloads enormes para:
 *   - Agotar la memoria del servidor (ataque de denegación de servicio)
 *   - Bloquear el event loop de Node.js mientras parsea JSON gigante
 * 10 MB es generoso para una API de reseñas (un JSON de reseña típico
 * pesa ~1 KB), pero permite flexibilidad para futuras features.
 */
app.use(express.json({ limit: '10mb' }));

// =============================================================================
// RUTAS DE LA API
// =============================================================================

/**
 * Prefijo /api/ — Convención REST:
 * Todas las rutas de la API empiezan con /api/ para:
 *   1. Separar las rutas de la API de posibles rutas de frontend (ej: /login)
 *   2. Facilitar la configuración de proxies y load balancers
 *   3. Permitir versionado futuro (ej: /api/v2/users)
 *
 * Cada router maneja un recurso específico y está definido en su propio
 * archivo para mantener la separación de responsabilidades (SoC).
 */
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reviews', reviewRoutes);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Health Check Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * GET / — Endpoint raíz que verifica que la API está activa.
 *
 * ¿POR QUÉ ES IMPORTANTE PARA RENDER?
 * Render hace health checks periódicos para verificar que el servicio
 * está vivo. Si no hay un endpoint que responda con 200, Render podría
 * marcar el servicio como "unhealthy" y reiniciarlo.
 *
 * También es útil para:
 *   - Verificar rápidamente que el deploy fue exitoso
 *   - Monitoreo externo (UptimeRobot, Pingdom, etc.)
 *   - El frontend puede hacer un ping antes de operaciones críticas
 */
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'FixUp API REST está activa',
        environment: isProduction ? 'production' : 'development',
        timestamp: new Date().toISOString(),
    });
});

// =============================================================================
// INICIALIZACIÓN DE BASE DE DATOS Y ARRANQUE DEL SERVIDOR
// =============================================================================

/**
 * startServer() — Función asíncrona de arranque
 * ──────────────────────────────────────────────
 *
 * ORDEN DE EJECUCIÓN (cada paso depende del anterior):
 *
 *   1. setRelations()    → Registra asociaciones Sequelize (hasMany, belongsTo)
 *   2. sequelize.sync()  → Crea/valida tablas en PostgreSQL
 *   3. loadInitialData() → Inserta datos seed si las tablas están vacías
 *   4. app.listen()      → Inicia el servidor HTTP en el puerto configurado
 *
 * ¿POR QUÉ setRelations() VA ANTES DE sync()?
 * Sequelize necesita conocer TODAS las asociaciones entre modelos ANTES
 * de generar el DDL (CREATE TABLE). Si sync() se ejecuta primero, las
 * tablas se crearían SIN las foreign keys, y las queries con include
 * fallarían con "Association not found".
 */
const startServer = async () => {
    try {
        // ─── PASO 1: Registrar relaciones entre modelos ─────────────
        setRelations();

        /**
         * ─── PASO 2: Sincronizar esquema de BD ───────────────────────
         *
         * COMPORTAMIENTO POR ENTORNO:
         *
         * PRODUCCIÓN — sequelize.sync({ alter: true }):
         *   - Compara el esquema actual de la BD con los modelos de Sequelize
         *   - Agrega columnas nuevas y modifica tipos si es necesario
         *   - NO elimina tablas ni datos existentes
         *   - Es seguro para deploys iterativos: cada deploy actualiza
         *     el esquema sin perder datos de usuarios reales
         *
         * DESARROLLO — sequelize.sync({ force: true }):
         *   - DROP TABLE + CREATE TABLE en cada arranque
         *   - Destruye TODOS los datos y recrea las tablas desde cero
         *   - Útil en desarrollo porque permite iterar rápidamente
         *     sobre cambios de esquema sin preocuparse por migraciones
         *   - NUNCA debe usarse en producción: destruiría los datos
         *     de todos los usuarios en cada deploy
         *
         * ⚠️ VULNERABILIDAD CORREGIDA:
         * Antes, force: true estaba hardcoded para TODOS los entornos.
         * Un deploy a Render con force: true habría borrado toda la BD
         * de producción. Ahora se usa alter: true en producción.
         *
         * NOTA PARA PRODUCCIÓN REAL:
         * En un proyecto profesional, se usarían migraciones de Sequelize
         * (sequelize-cli) en vez de sync() para tener control granular
         * y reversible sobre los cambios de esquema. sync() es aceptable
         * para proyectos académicos y prototipos.
         */
        if (isProduction) {
            await sequelize.sync({ alter: true });
            console.log('✅ Base de datos sincronizada (modo producción: alter).');
        } else {
            await sequelize.sync({ force: true });
            console.log('✅ Base de datos sincronizada (modo desarrollo: force).');
        }

        // ─── PASO 3: Cargar datos iniciales (seed) ──────────────────
        /**
         * loadInitialData() verifica internamente si las tablas están vacías
         * antes de insertar. En producción con alter: true, esto significa
         * que los seeds solo se cargan UNA VEZ (en el primer deploy).
         * En desarrollo con force: true, se cargan en cada arranque
         * porque las tablas se recrean vacías.
         */
        await loadInitialData();

        // ─── PASO 4: Iniciar servidor HTTP ──────────────────────────
        /**
         * '0.0.0.0' — Escuchar en todas las interfaces de red.
         * En Render, el servidor corre dentro de un contenedor Docker.
         * Si se escucha solo en 'localhost' (127.0.0.1), las peticiones
         * que Render enruta desde su load balancer NO llegarían al
         * servidor porque vienen desde una interfaz de red virtual,
         * no desde localhost. '0.0.0.0' acepta conexiones desde cualquier
         * interfaz, lo cual es necesario para que Render pueda enrutar
         * tráfico al contenedor.
         */
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor FixUp corriendo en puerto ${PORT}`);
            console.log(`📌 Entorno: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
            if (!isProduction) {
                console.log(`🔗 URL local: http://localhost:${PORT}`);
                console.log(`💡 Health check: http://localhost:${PORT}/`);
            }
        });
    } catch (error) {
        /**
         * Si cualquier paso falla (conexión a BD, sync, seeds), el error
         * se captura y se imprime con contexto. En producción, Render
         * detectará que el proceso terminó y lo reiniciará automáticamente.
         */
        console.error('❌ Error crítico al iniciar el servidor:', error);
        /**
         * process.exit(1) — Terminar el proceso con código de error.
         * En Render, esto dispara un reinicio automático. Sin este exit,
         * el proceso se quedaría vivo pero sin servidor HTTP activo,
         * lo cual es peor que un crash (el servicio parece "vivo" pero
         * no responde a peticiones).
         */
        process.exit(1);
    }
};

startServer();
