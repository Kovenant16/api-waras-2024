// src/controllers/notificationController.js

import { sendPushNotificationToClient, sendNotificationToTopic } from '../services/notificationService.js'; // Ajusta la ruta si es necesario

/**
 * Controlador para enviar una notificación push a un cliente específico.
 * @param {Object} req - Objeto de solicitud.
 * @param {Object} res - Objeto de respuesta.
 */
export const sendNotificationToClient = async (req, res) => {
    const { clientId, title, body, data, options } = req.body;

    // Validaciones básicas
    if (!clientId || !title || !body) {
        return res.status(400).json({ msg: 'Faltan campos obligatorios: clientId, title, body.' });
    }

    try {
        const result = await sendPushNotificationToClient(clientId, title, body, data, options);
        if (result.success > 0) {
            res.status(200).json({ msg: 'Notificación enviada exitosamente.', result });
        } else {
            res.status(400).json({ msg: 'La notificación no pudo ser enviada a ningún token válido.', result });
        }
    } catch (error) {
        console.error('Error en el controlador al enviar notificación a cliente:', error);
        res.status(500).json({ msg: 'Error interno del servidor al enviar notificación.', error: error.message });
    }
};

/**
 * Controlador para enviar una notificación a un tópico FCM.
 * @param {Object} req - Objeto de solicitud.
 * @param {Object} res - Objeto de respuesta.
 */
export const sendNotificationToFCMTopic = async (req, res) => {
    const { topic, title, body, data } = req.body;

    if (!topic || !title || !body) {
        return res.status(400).json({ msg: 'Faltan campos obligatorios: topic, title, body.' });
    }

    try {
        const result = await sendNotificationToTopic(topic, title, body, data);
        res.status(200).json({ msg: `Notificación enviada a tópico "${topic}" exitosamente.`, result });
    } catch (error) {
        console.error('Error en el controlador al enviar notificación a tópico:', error);
        res.status(500).json({ msg: 'Error interno del servidor al enviar notificación a tópico.', error: error.message });
    }
};