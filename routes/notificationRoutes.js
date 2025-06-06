// src/routes/notificationRoutes.js

import express from 'express';
import { sendNotificationToClient, sendNotificationToFCMTopic } from '../controllers/notificationController.js'; // Ajusta la ruta si es necesario

const router = express.Router();

// Ruta para enviar una notificación a un cliente específico por su ID
router.post('/send-to-client', sendNotificationToClient);

// Ruta para enviar una notificación a un tópico FCM (ej. para todos los usuarios de Android/iOS)
router.post('/send-to-topic', sendNotificationToFCMTopic);

export default router;