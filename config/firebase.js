import admin from 'firebase-admin';

/**
 * Inicialización singleton de Firebase Admin SDK.
 *
 * Usa FIREBASE_SERVICE_ACCOUNT_BASE64: el serviceAccount.json completo
 * codificado en base64. Esto evita todos los problemas de escaping de
 * la private_key al almacenarla como variable de entorno en Render.
 *
 * Para generar el valor:
 *   base64 -i serviceAccount.json | tr -d '\n'
 */
if (!admin.apps.length) {
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

export const messaging = admin.messaging();
export const db        = admin.firestore();
export default admin;
