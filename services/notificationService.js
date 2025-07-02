// src/services/notificationService.js

import admin from 'firebase-admin';
import Cliente from '../models/Cliente.js'; // Ajusta la ruta a tu modelo Cliente
import mongoose from 'mongoose'; // Necesario para el .session si lo usas
import Usuario from '../models/Usuario.js';

/**
 * Envía una notificación push a un cliente específico y limpia los tokens inválidos.
 * @param {string} clienteId - El ID del cliente al que se enviará la notificación.
 * @param {string} title - El título de la notificación.
 * @param {string} body - El cuerpo del mensaje de la notificación.
 * @param {object} data - (Opcional) Datos personalizados para enviar con la notificación.
 * @param {object} options - (Opcional) Opciones adicionales para el mensaje FCM (ej. priority, timeToLive).
 */
export const sendPushNotificationToClient = async (clienteId, title, body, data = {}, options = {}) => {
    try {
        const cliente = await Cliente.findById(clienteId);

        if (!cliente) {
            console.warn(`[Notification Service] Cliente con ID ${clienteId} no encontrado. No se enviará notificación.`);
            return;
        }

        if (!cliente.fcmTokens || cliente.fcmTokens.length === 0) {
            console.log(`[Notification Service] Cliente ${clienteId} no tiene tokens FCM registrados.`);
            return;
        }

        const tokensToSend = cliente.fcmTokens.map(t => t.token);

        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: {
                ...data,
                clienteId: clienteId.toString(), // Asegúrate de que el clienteId siempre vaya en los datos
            },
            tokens: tokensToSend,
            ...options // Permitir opciones adicionales como priority, timeToLive
        };

        const response = await admin.messaging().sendEachForMulticast(message); // sendEachForMulticast es ideal para muchos tokens

        console.log(`[Notification Service] Notificación FCM enviada a cliente ${clienteId}. Éxitos: ${response.successCount}, Fallos: ${response.failureCount}`);

        // --- Lógica CLAVE para la limpieza pasiva de tokens ---
        if (response.failureCount > 0) {
            const tokensToRemove = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const failedToken = tokensToSend[idx];
                    // Errores que indican que el token ya no es válido
                    if (resp.error && (
                        resp.error.code === 'messaging/invalid-registration-token' ||
                        resp.error.code === 'messaging/registration-token-not-registered' ||
                        resp.error.code === 'messaging/unregistered' // Otro error común que indica invalidez
                    )) {
                        tokensToRemove.push(failedToken);
                        console.log(`[Notification Service] Token inválido detectado para cliente ${clienteId}: ${failedToken}. Error: ${resp.error.message}`);
                    } else {
                        console.warn(`[Notification Service] Error desconocido al enviar a token ${failedToken}: ${resp.error?.message || 'Sin mensaje de error'}`);
                    }
                }
            });

            if (tokensToRemove.length > 0) {
                // Actualizar el documento del cliente en la DB para eliminar los tokens inválidos
                cliente.fcmTokens = cliente.fcmTokens.filter(t => !tokensToRemove.includes(t.token));
                await cliente.save();
                console.log(`[Notification Service] Eliminados ${tokensToRemove.length} tokens inválidos para cliente ${clienteId}.`);
            }
        }

        return { success: response.successCount, failure: response.failureCount };

    } catch (error) {
        console.error(`[Notification Service] Error al enviar notificación FCM a cliente ${clienteId}:`, error);
        throw new Error('Error al enviar notificación push.'); // Relanzar para que el llamador pueda manejarlo
    }
};

/**
 * Envía una notificación a un tópico FCM.
 * @param {string} topic - El nombre del tópico.
 * @param {string} title - El título de la notificación.
 * @param {string} body - El cuerpo del mensaje.
 * @param {object} data - Datos personalizados.
 */
export const sendNotificationToTopic = async (topic, title, body, data = {}) => {
    const message = {
        notification: {
            title: title,
            body: body,
        },
        data: data,
        topic: topic,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log(`[Notification Service] Notificación enviada a tópico "${topic}":`, response);
        return response;
    } catch (error) {
        console.error(`[Notification Service] Error al enviar notificación a tópico "${topic}":`, error);
        throw new Error('Error al enviar notificación a tópico.');
    }
};


// --- NUEVA FUNCIÓN: Envía notificación a motorizados activos ---

/**
 * Envía una notificación de 'Nuevo Pedido' a todos los usuarios 'motorizado' activos.
 * Incluye lógica de limpieza de tokens inválidos.
 * @param {string} title - El título de la notificación (ej. "Nuevo Pedido").
 * @param {string} body - El cuerpo del mensaje (ej. "Revisa la bandeja de pedidos disponibles").
 * @param {object} data - (Opcional) Datos personalizados para la app (ej. { orderId: '...' }).
 * @param {object} options - (Opcional) Opciones FCM adicionales (ej. priority, timeToLive).
 */
export const sendNewOrderNotificationToMotorizados = async (title, body, data = {}, options = {}) => {

    console.log("sending new order notification to motorizados");
    
    try {
        const motorizados = await Usuario.find({
            rol: 'motorizado',
            activo: true
        });

        
        

        if (motorizados.length === 0) {
            console.log('[Notification Service] No se encontraron motorizados activos para enviar la notificación.');
            return { success: 0, failure: 0, message: 'No active motorizados found.' };
        }

        let allTokensToSend = [];
        motorizados.forEach(motorizado => {
            if (motorizado.fcmTokens && motorizado.fcmTokens.length > 0) {
                motorizado.fcmTokens.forEach(tokenObj => {
                    if (tokenObj.token) {
                        allTokensToSend.push(tokenObj.token);
                    }
                });
            }
        });

        allTokensToSend = [...new Set(allTokensToSend)]; // Eliminar duplicados

        if (allTokensToSend.length === 0) {
            console.log('[Notification Service] Ningún token FCM válido encontrado para los motorizados activos.');
            return { success: 0, failure: 0, message: 'No valid FCM tokens found for active motorizados.' };
        }

        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: {
                ...data,
                notificationType: 'new_order',
            },
            tokens: allTokensToSend,
            ...options,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                    },
                },
            },
        };

        console.log('--- FCM Notification Payload to be sent to Motorizados ---');
        console.log('Targeting the following FCM Tokens:', allTokensToSend);
        console.log('Notification Message:', JSON.stringify(message, null, 2));
        console.log('---------------------------------------------------------');

        const response = await admin.messaging().sendEachForMulticast(message);

        console.log(`[Notification Service] Notificación FCM enviada a motorizados. Éxitos: ${response.successCount}, Fallos: ${response.failureCount}`);

        if (response.failureCount > 0) {
            const tokensToRemoveGlobally = new Set();
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const failedToken = allTokensToSend[idx];
                    if (resp.error && (
                        resp.error.code === 'messaging/invalid-registration-token' ||
                        resp.error.code === 'messaging/registration-token-not-registered' ||
                        resp.error.code === 'messaging/unregistered'
                    )) {
                        tokensToRemoveGlobally.add(failedToken);
                        console.log(`[Notification Service] Token inválido detectado para motorizado: ${failedToken}. Error: ${resp.error.message}`);
                    } else {
                        console.warn(`[Notification Service] Error desconocido al enviar a token de motorizado ${failedToken}: ${resp.error?.message || 'Sin mensaje de error'}`);
                    }
                }
            });

            if (tokensToRemoveGlobally.size > 0) {
                await Usuario.updateMany(
                    { "fcmTokens.token": { $in: [...tokensToRemoveGlobally] } },
                    { $pull: { fcmTokens: { token: { $in: [...tokensToRemoveGlobally] } } } }
                );
                console.log(`[Notification Service] Eliminados ${tokensToRemoveGlobally.size} tokens inválidos de la base de datos.`);
            }
        }

        return { success: response.successCount, failure: response.failureCount };

    } catch (error) {
        console.error('[Notification Service] Error general al enviar notificación a motorizados:', error);
        throw new Error('Error al enviar notificación a motorizados.');
    }
};