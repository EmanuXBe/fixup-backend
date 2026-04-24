import express from 'express';
import { messaging, db } from '../config/firebase.js';

const router = express.Router();

// =============================================================================
// HELPER
// =============================================================================

/**
 * Envía un mensaje FCM y absorbe el error si el token ya no está registrado
 * (el cliente Android lo renovará solo en el próximo login).
 * Cualquier otro error se re-lanza para que el handler lo capture como 500.
 */
const sendNotification = async (token, notification, data) => {
    try {
        await messaging.send({ token, notification, data, android: { priority: 'high' } });
    } catch (err) {
        if (err.code === 'messaging/registration-token-not-registered') {
            console.warn('FCM token desactualizado, ignorando:', token.slice(0, 20) + '…');
            return; // no relanzar — el cliente lo renovará
        }
        throw err;
    }
};

// =============================================================================
// POST /notifications/like
// =============================================================================

/**
 * El cliente Android llama a este endpoint después de escribir
 * reviews/{reviewId}/likes/{likerId} en Firestore.
 *
 * Body: { reviewId: string, likerId: string, likerName: string }
 *
 * Flujo:
 *   1. Leer reviews/{reviewId} → obtener userId del dueño
 *   2. Si likerId === userId → el dueño se dio like a sí mismo, no notificar
 *   3. Leer users/{userId} → obtener fcmToken
 *   4. Si no hay token → 200 silencioso
 *   5. Enviar FCM con type: "LIKE_EVENT"
 */
router.post('/like', async (req, res) => {
    try {
        const { reviewId, likerId, likerName } = req.body;

        if (!reviewId || !likerId || !likerName) {
            return res.status(400).json({ message: 'reviewId, likerId y likerName son obligatorios.' });
        }

        // 1. Leer la review en Firestore
        const reviewSnap = await db.collection('reviews').doc(reviewId).get();
        if (!reviewSnap.exists) {
            return res.status(404).json({ message: `Review '${reviewId}' no encontrada en Firestore.` });
        }

        const ownerId = reviewSnap.data().userId;

        // 2. No notificar si el autor se da like a sí mismo
        if (likerId === ownerId) {
            return res.status(200).json({ message: 'Self-like ignorado, no se envía notificación.' });
        }

        // 3. Leer el usuario dueño de la review
        const userSnap = await db.collection('users').doc(ownerId).get();
        if (!userSnap.exists) {
            return res.status(404).json({ message: `Usuario '${ownerId}' no encontrado en Firestore.` });
        }

        const fcmToken = userSnap.data().fcmToken;

        // 4. Sin token → respuesta silenciosa 200
        if (!fcmToken) {
            return res.status(200).json({ message: 'Usuario sin fcmToken registrado, notificación omitida.' });
        }

        // 5. Enviar notificación FCM
        await sendNotification(
            fcmToken,
            {
                title: '¡A alguien le gustó tu reseña!',
                body:  `${likerName} le dio like a tu reseña.`,
            },
            { type: 'LIKE_EVENT' },
        );

        return res.status(200).json({ message: 'Notificación LIKE_EVENT enviada.' });
    } catch (error) {
        console.error('Error en /notifications/like:', error);
        return res.status(500).json({ message: error.message });
    }
});

// =============================================================================
// POST /notifications/follow
// =============================================================================

/**
 * El cliente Android llama a este endpoint después de ejecutar toggleFollowUser()
 * cuando el resultado es un FOLLOW (no un unfollow).
 *
 * Body: { targetUserId: string, followerName: string }
 *
 * Flujo:
 *   1. Leer users/{targetUserId} → obtener fcmToken
 *   2. Si no hay token → 200 silencioso
 *   3. Enviar FCM con type: "FOLLOW_EVENT"
 */
router.post('/follow', async (req, res) => {
    try {
        const { targetUserId, followerName } = req.body;

        if (!targetUserId || !followerName) {
            return res.status(400).json({ message: 'targetUserId y followerName son obligatorios.' });
        }

        // 1. Leer el usuario destino
        const userSnap = await db.collection('users').doc(targetUserId).get();
        if (!userSnap.exists) {
            return res.status(404).json({ message: `Usuario '${targetUserId}' no encontrado en Firestore.` });
        }

        const fcmToken = userSnap.data().fcmToken;

        // 2. Sin token → respuesta silenciosa 200
        if (!fcmToken) {
            return res.status(200).json({ message: 'Usuario sin fcmToken registrado, notificación omitida.' });
        }

        // 3. Enviar notificación FCM
        await sendNotification(
            fcmToken,
            {
                title: '¡Tienes un nuevo seguidor!',
                body:  `${followerName} comenzó a seguirte.`,
            },
            { type: 'FOLLOW_EVENT' },
        );

        return res.status(200).json({ message: 'Notificación FOLLOW_EVENT enviada.' });
    } catch (error) {
        console.error('Error en /notifications/follow:', error);
        return res.status(500).json({ message: error.message });
    }
});

export default router;
