import express from 'express';
import { messaging, db } from '../config/firebase.js';
import { validateFirebaseToken } from '../middlewares/authMiddleware.js';
import { AppError } from '../middlewares/errorMiddleware.js';

const router = express.Router();

// =============================================================================
// HELPER
// =============================================================================

const sendNotification = async (token, notification, data) => {
    try {
        await messaging.send({ token, notification, data, android: { priority: 'high' } });
        return true;
    } catch (err) {
        if (err.code === 'messaging/registration-token-not-registered') {
            console.warn('FCM token desactualizado, ignorando:', token.slice(0, 20) + '…');
            return false;
        }
        throw err;
    }
};

// Rutas protegidas
router.use(validateFirebaseToken);

// =============================================================================
// POST /notifications/like
// =============================================================================

router.post('/like', async (req, res, next) => {
    try {
        const { reviewId, likerId, likerName, targetUserId } = req.body;

        if (!reviewId || !likerId || !likerName || !targetUserId) {
            throw new AppError('reviewId, likerId, likerName y targetUserId son obligatorios.', 400, 'MISSING_FIELDS');
        }

        if (likerId === targetUserId) {
            return res.status(200).json({ status: 'success', message: 'Self-like ignorado.' });
        }

        const userSnap = await db.collection('users').doc(targetUserId).get();
        if (!userSnap.exists) {
            throw new AppError(`Usuario '${targetUserId}' no encontrado en Firestore.`, 404, 'USER_NOT_FOUND');
        }

        const fcmToken = userSnap.data().fcmToken;

        if (!fcmToken) {
            return res.status(200).json({ status: 'success', message: 'Usuario sin fcmToken.' });
        }

        const fcmSent = await sendNotification(
            fcmToken,
            {
                title: '¡A alguien le gustó tu reseña!',
                body:  `${likerName} le dio like a tu reseña.`,
            },
            {
                type:         'LIKE_EVENT',
                reviewId:     String(reviewId),
                likerName:    String(likerName),
                targetUserId: String(targetUserId),
            },
        );

        if (!fcmSent) {
            return res.status(200).json({ status: 'success', message: 'FCM token vencido.' });
        }

        try {
            await db.collection('users').doc(targetUserId).collection('notifications').add({
                title:           '¡A alguien le gustó tu reseña!',
                message:         `${likerName} le dio like a tu reseña.`,
                date:            new Date().toISOString(),
                isRead:          false,
                actionType:      null,
                profileImageUrl: null,
            });
        } catch (fsErr) {
            console.warn('No se pudo escribir notificación LIKE en Firestore:', fsErr.message);
        }

        return res.status(200).json({ status: 'success', message: 'Notificación LIKE_EVENT enviada.' });
    } catch (error) {
        next(error);
    }
});

// =============================================================================
// POST /notifications/follow
// =============================================================================

router.post('/follow', async (req, res, next) => {
    try {
        const { targetUserId, followerName } = req.body;

        if (!targetUserId || !followerName) {
            throw new AppError('targetUserId y followerName son obligatorios.', 400, 'MISSING_FIELDS');
        }

        const userSnap = await db.collection('users').doc(targetUserId).get();
        if (!userSnap.exists) {
            throw new AppError(`Usuario '${targetUserId}' no encontrado en Firestore.`, 404, 'USER_NOT_FOUND');
        }

        const fcmToken = userSnap.data().fcmToken;

        if (!fcmToken) {
            return res.status(200).json({ status: 'success', message: 'Usuario sin fcmToken.' });
        }

        const fcmSent = await sendNotification(
            fcmToken,
            {
                title: '¡Tienes un nuevo seguidor!',
                body:  `${followerName} comenzó a seguirte.`,
            },
            {
                type:         'FOLLOW_EVENT',
                targetUserId: String(targetUserId),
            },
        );

        if (!fcmSent) {
            return res.status(200).json({ status: 'success', message: 'FCM token vencido.' });
        }

        try {
            await db.collection('users').doc(targetUserId).collection('notifications').add({
                title:           '¡Tienes un nuevo seguidor!',
                message:         `${followerName} comenzó a seguirte.`,
                date:            new Date().toISOString(),
                isRead:          false,
                actionType:      null,
                profileImageUrl: null,
            });
        } catch (fsErr) {
            console.warn('No se pudo escribir notificación FOLLOW en Firestore:', fsErr.message);
        }

        return res.status(200).json({ status: 'success', message: 'Notificación FOLLOW_EVENT enviada.' });
    } catch (error) {
        next(error);
    }
});

export default router;
