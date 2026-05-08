import admin from 'firebase-admin';

/**
 * Inicialización singleton de Firebase Admin SDK.
 *
 * ENTORNOS:
 *
 * DESARROLLO (FIRESTORE_EMULATOR_HOST definida):
 *   El Admin SDK detecta FIRESTORE_EMULATOR_HOST automáticamente y redirige
 *   todas las operaciones de Firestore al emulador local.
 *   No se necesitan credenciales reales; se usa un proyecto "demo-*" que
 *   el emulador acepta sin autenticación.
 *
 * PRODUCCIÓN (Render):
 *   Usa FIREBASE_SERVICE_ACCOUNT_BASE64: el serviceAccount.json completo
 *   codificado en base64. Esto evita problemas de escaping de la private_key.
 *   Para generar el valor: base64 -i serviceAccount.json | tr -d '\n'
 */
if (!admin.apps.length) {
    const useEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

    if (useEmulator) {
        // El emulador no requiere credenciales reales.
        // FIREBASE_PROJECT_ID debe coincidir con el usado en firebase.json (singleProjectMode).
        admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || 'fixup-f2128',
        });
        console.log(`🔧 Firebase Admin conectado al emulador de Firestore (${process.env.FIRESTORE_EMULATOR_HOST})`);
    } else {
        const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
        if (!b64) {
            throw new Error(
                'Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT_BASE64. ' +
                'Genera el valor con: base64 -i serviceAccount.json | tr -d "\\n"'
            );
        }
        const serviceAccount = JSON.parse(
            Buffer.from(b64, 'base64').toString('utf8')
        );
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
}

export const messaging = admin.messaging();
export const db        = admin.firestore();
export default admin;
