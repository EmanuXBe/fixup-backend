import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

/**
 * =============================================================================
 * Configuración de Conexión a Base de Datos PostgreSQL (Sequelize)
 * =============================================================================
 *
 * ARQUITECTURA DE SEGURIDAD — Separación de entornos:
 * ────────────────────────────────────────────────────
 * Este módulo implementa el patrón de configuración basada en variables de
 * entorno (12-Factor App, Factor III: "Store config in the environment").
 *
 * ¿POR QUÉ VARIABLES DE ENTORNO Y NO UN ARCHIVO DE CONFIGURACIÓN?
 * 1. SEGURIDAD: Las credenciales (contraseñas, URLs de BD) NUNCA se
 *    almacenan en el código fuente ni en el repositorio Git. Un archivo
 *    config.json con credenciales que se pushea a GitHub es una de las
 *    vulnerabilidades más comunes en proyectos estudiantiles.
 * 2. PORTABILIDAD: El mismo código corre en desarrollo (local), staging
 *    y producción (Render) sin modificaciones. Solo cambian las variables
 *    de entorno.
 * 3. ESTÁNDAR DE LA INDUSTRIA: Render, Heroku, AWS, y todos los PaaS
 *    modernos inyectan configuración via process.env.
 *
 * FLUJO DE CARGA DE VARIABLES:
 * ────────────────────────────
 * 1. dotenv.config() busca un archivo .env en la raíz del proyecto
 *    y carga sus variables en process.env.
 * 2. En PRODUCCIÓN (Render), el archivo .env NO existe. Las variables
 *    se configuran directamente en el dashboard de Render y se inyectan
 *    automáticamente en process.env por el runtime de Node.js.
 * 3. En DESARROLLO (local), el archivo .env contiene las credenciales
 *    locales. Este archivo está en .gitignore para que NUNCA se suba
 *    al repositorio.
 *
 * @see index.js — Punto de entrada que consume esta conexión
 * @see .gitignore — Debe incluir .env para proteger credenciales
 */
dotenv.config();

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Detección del entorno de ejecución
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NODE_ENV es la variable de entorno estándar en Node.js para indicar
 * el entorno de ejecución. Los valores convencionales son:
 *   - 'development' → Máquina local del desarrollador
 *   - 'production'  → Servidor de despliegue (Render, Heroku, etc.)
 *   - 'test'        → Ejecución de pruebas automatizadas
 *
 * RENDER Y NODE_ENV:
 * Render establece automáticamente NODE_ENV='production' en todos los
 * servicios. No es necesario configurarla manualmente en el dashboard.
 *
 * VALOR POR DEFECTO:
 * Si NODE_ENV no está definida (ej: el desarrollador no la puso en .env),
 * asumimos 'development' para evitar que SSL se active accidentalmente
 * en local, lo cual causaría errores de conexión con PostgreSQL sin SSL.
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuración condicional de SSL para PostgreSQL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ¿POR QUÉ SSL ES CONDICIONAL Y NO SIEMPRE ACTIVO?
 *
 * EN PRODUCCIÓN (Render):
 *   - Render provee bases de datos PostgreSQL con SSL obligatorio.
 *   - Sin ssl.require = true, la conexión es rechazada por el servidor.
 *   - rejectUnauthorized = false es necesario porque Render usa certificados
 *     internos que no están firmados por una CA pública reconocida por Node.js.
 *     En un entorno enterprise se usaría el certificado CA de Render, pero
 *     para el tier gratuito esta configuración es la estándar documentada.
 *
 * EN DESARROLLO (local):
 *   - PostgreSQL local normalmente NO tiene SSL configurado.
 *   - Si activamos ssl.require = true en local, la conexión falla con
 *     "The server does not support SSL connections".
 *   - Por eso dialectOptions solo incluye SSL cuando isProduction es true.
 *
 * ALTERNATIVA MÁS SEGURA (producción enterprise):
 *   ssl: {
 *       require: true,
 *       rejectUnauthorized: true,        // ← Validar certificado del servidor
 *       ca: fs.readFileSync('ca.pem'),    // ← Certificado CA del proveedor
 *   }
 *   Esto no se usa aquí porque Render Free Tier no provee un CA descargable.
 */
const dialectOptions = isProduction
    ? {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    }
    : {};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Instancia de Sequelize — Conexión a PostgreSQL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * DATABASE_URL:
 * Es la variable de entorno que contiene la cadena de conexión completa
 * a PostgreSQL en formato URI:
 *   postgres://usuario:contraseña@host:puerto/nombre_bd
 *
 * Render genera esta URL automáticamente al crear una base de datos
 * PostgreSQL y la inyecta como variable de entorno interna si la BD
 * está vinculada al servicio web. También se puede copiar manualmente
 * desde el dashboard de Render → PostgreSQL → External Database URL.
 *
 * VALIDACIÓN DE DATABASE_URL:
 * Si la variable no está definida, lanzamos un error explícito en vez
 * de dejar que Sequelize falle con un mensaje críptico. Esto facilita
 * el debugging tanto en local como en producción.
 */
if (!process.env.DATABASE_URL) {
    throw new Error(
        '❌ La variable de entorno DATABASE_URL no está definida.\n' +
        '   → En desarrollo: crea un archivo .env con DATABASE_URL=postgres://user:pass@host:port/dbname\n' +
        '   → En producción (Render): configura DATABASE_URL en el dashboard de Environment Variables.'
    );
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    /**
     * dialect: 'postgres'
     * Indica a Sequelize qué driver de base de datos usar.
     * Sequelize soporta mysql, sqlite, mariadb, mssql y postgres.
     * Debe coincidir con la dependencia instalada (pg + pg-hstore).
     */
    dialect: 'postgres',

    /**
     * protocol: 'postgres'
     * Especifica el protocolo de comunicación. Es redundante con dialect
     * en la mayoría de casos, pero algunos proveedores cloud lo requieren
     * explícitamente para resolver la conexión correctamente.
     */
    protocol: 'postgres',

    /**
     * dialectOptions — Configuración específica del driver pg.
     * En producción incluye SSL; en desarrollo es un objeto vacío.
     * Ver la sección de SSL arriba para la justificación detallada.
     */
    dialectOptions,

    /**
     * logging — Control de logs SQL.
     *
     * EN PRODUCCIÓN: false — Los logs SQL en producción:
     *   - Degradan el rendimiento (I/O de consola)
     *   - Pueden exponer datos sensibles en los logs del servidor
     *   - Generan ruido que dificulta encontrar errores reales
     *
     * EN DESARROLLO: console.log — Ver las queries SQL ayuda a:
     *   - Debuggear problemas de performance (N+1, queries lentas)
     *   - Verificar que Sequelize genera el SQL esperado
     *   - Entender cómo los includes se traducen a JOINs
     *
     * Se puede cambiar a false en dev si los logs son demasiado verbosos.
     */
    logging: isProduction ? false : console.log,

    /**
     * pool — Configuración del pool de conexiones.
     *
     * ¿QUÉ ES UN POOL DE CONEXIONES?
     * Crear una nueva conexión TCP a PostgreSQL por cada query es costoso
     * (~50-100ms). Un pool mantiene un conjunto de conexiones abiertas
     * y las reutiliza, reduciendo la latencia a ~1ms por query.
     *
     * CONFIGURACIÓN PARA RENDER FREE TIER:
     * - max: 5 → Máximo de conexiones simultáneas. Render Free permite
     *   hasta 97 conexiones, pero 5 es suficiente para una API con
     *   tráfico bajo-medio y evita agotar el límite compartido.
     * - min: 0 → No mantener conexiones ociosas. En un tier gratuito,
     *   liberar recursos cuando no hay tráfico es importante.
     * - acquire: 30000 → 30 segundos máximo para obtener una conexión
     *   del pool. Si todas están ocupadas y no se libera una en 30s,
     *   la query falla con timeout (mejor que esperar indefinidamente).
     * - idle: 10000 → Si una conexión lleva 10 segundos sin usarse,
     *   se cierra y se devuelve al pool. Libera recursos del servidor
     *   PostgreSQL en periodos de baja actividad.
     */
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});

export default sequelize;
