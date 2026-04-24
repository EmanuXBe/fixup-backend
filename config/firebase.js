import admin from 'firebase-admin';

/**
 * Inicialización singleton de Firebase Admin SDK.
 *
 * Exporta:
 *   messaging — para enviar notificaciones FCM
 *   db        — cliente Firestore para leer tokens y documentos
 *
 * Variables de entorno requeridas (.env y Render):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_PRIVATE_KEY_ID
 *   FIREBASE_PRIVATE_KEY   (con \n literales; se reemplazan aquí)
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_CLIENT_ID
 */
const parsePrivateKey = (raw = '') =>
    raw
        .replace(/^["']|["']$/g, '')  // quita comillas si Render las añadió
        .replace(/\\n/g, '\n');        // convierte \n literal a salto de línea real

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            type:           'service_account',
            project_id:     process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key:    parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
            client_email:   process.env.FIREBASE_CLIENT_EMAIL,
            client_id:      process.env.FIREBASE_CLIENT_ID,
            auth_uri:       'https://accounts.google.com/o/oauth2/auth',
            token_uri:      'https://oauth2.googleapis.com/token',
        }),
    });
}

export const messaging = admin.messaging();
export const db        = admin.firestore();
export default admin;
