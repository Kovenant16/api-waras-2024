import Cliente from "../models/Cliente.js";
import EnvioPaquete from "../models/EnvioPaquete.js";
import { sendNewOrderNotificationToMotorizados, sendNotificationToClient } from "../services/notificationService.js";


export const getClientFcmTokens = async (clientId) => {
    try {
        const client = await Cliente.findById(clientId);
        if (client && client.fcmTokens && client.fcmTokens.length > 0) {
            // Mapea el array de objetos a un array de solo los strings de los tokens
            return client.fcmTokens.map(fcmTokenObj => fcmTokenObj.token);
        }
        return []; // Retorna un array vacío si no hay cliente o tokens
    } catch (error) {
        console.error(`Error al obtener los tokens FCM para el cliente ${clientId}:`, error);
        return [];
    }
};

const crearEnvioPaquete = async (req, res) => {
    try {
        console.log('Backend Recibió req.body:', JSON.stringify(req.body, null, 2));

        // Desestructura solo los campos planos del primer nivel de req.body
        // Los objetos 'recojo' y 'entrega' no los desestructuramos aquí
        // porque los accederemos directamente desde req.body
        const {
            costoEnvio,
            distanciaEnvioKm,
            paymentMethod,
            whoPaysDelivery,
            horaRecojoEstimada,
            notes,
            cliente, // Cambiado de 'clientId' a 'cliente' para coincidir con el body si no lo desestructuras como clientId
            generadoPor, // Asegúrate de que esto venga o lo generes
            // Si el frontend envía 'pickupAddress', 'pickupReference', etc. planos en el body,
            // debes desestructurarlos aquí. Pero según tu último log, vienen DENTRO de 'recojo' y 'entrega'.
            // Por lo tanto, ¡no deben estar en la desestructuración de primer nivel!
            // Si tu frontend envía estos campos *como están en el log*, entonces NO los desestructuras aquí.
            // Los accedes directamente desde req.body.recojo.direccion, etc.
        } = req.body;

        // ACCEDEMOS DIRECTAMENTE A LAS PROPIEDADES ANIDADAS DEL req.body
        // NO DESESTRUCTURAS LAS PROPIEDADES ANIDADAS EN EL NIVEL SUPERIOR
        const nuevoEnvio = new EnvioPaquete({
            tipoPedido: req.body.tipoPedido || "paqueteria", // Puedes tomarlo del body o usar default
            estadoPedido: "sin asignar",
            costoEnvio: costoEnvio,
            distanciaEnvioKm: distanciaEnvioKm,

            recojo: {
                // ACCEDEMOS A LAS PROPIEDADES DENTRO DE req.body.recojo
                direccion: req.body.recojo.direccion,
                referencia: req.body.recojo.referencia,
                telefonoContacto: req.body.recojo.telefonoContacto,
                detallesAdicionales: req.body.recojo.detallesAdicionales,
                gps: {
                    // ¡AHORA SÍ! ACCEDES A LA LATITUDE/LONGITUDE CORRECTAMENTE
                    latitude: req.body.recojo.gps.latitude,
                    longitude: req.body.recojo.gps.longitude,
                },
            },

            entrega: {
                // ACCEDEMOS A LAS PROPIEDADES DENTRO DE req.body.entrega
                direccion: req.body.entrega.direccion,
                referencia: req.body.entrega.referencia,
                telefonoContacto: req.body.entrega.telefonoContacto,
                detallesAdicionales: req.body.entrega.detallesAdicionales,
                gps: {
                    // ¡AHORA SÍ! ACCEDES A LA LATITUDE/LONGITUDE CORRECTAMENTE
                    latitude: req.body.entrega.gps.latitude,
                    longitude: req.body.entrega.gps.longitude,
                },
            },

            medioDePago: paymentMethod,
            quienPagaEnvio: whoPaysDelivery,
            horaRecojoEstimada: horaRecojoEstimada,
            notasPedido: notes,
            cliente: cliente, // Asume que 'cliente' viene directo en req.body
            generadoPor: generadoPor, // Asume que 'generadoPor' viene directo en req.body
        });

        const envioGuardado = await nuevoEnvio.save();

        // --- LÓGICA DE NOTIFICACIÓN PARA MOTORIZADOS (Añadir esto) ---
        try {
            await sendNewOrderNotificationToMotorizados(
                "¡Nuevo Envío de Paquete!", // Título de la notificación
                "Revisa la bandeja de envíos disponibles. ¡Hay un nuevo paquete para entregar!", // Cuerpo de la notificación
                {
                    envioId: envioGuardado._id.toString(), // Datos personalizados para la app del driver
                    // Puedes añadir más datos relevantes aquí si la app del driver los necesita
                    // Ej: origen: envioGuardado.recojo.direccion,
                    // destino: envioGuardado.entrega.direccion,
                    // costo: envioGuardado.costoEnvio.toString()
                },
                {
                    priority: 'high', // Opciones FCM adicionales
                }
            );
            console.log(`[envioPaqueteController] Notificación de nuevo envío enviada a motorizados para envío ${envioGuardado._id}.`);
        } catch (notificationError) {
            console.error(`[envioPaqueteController] Error al enviar notificación de nuevo envío para ${envioGuardado._id}:`, notificationError);
            // Decide cómo manejar este error: un fallo en la notificación no debería impedir la creación del envío.
            // Simplemente registramos el error y continuamos.
        }
        // --- FIN LÓGICA DE NOTIFICACIÓN ---
        res.status(201).json({
            msg: "Envío de paquete creado exitosamente",
            envio: envioGuardado
        });

    } catch (error) {
        console.error("Error al crear el envío del paquete:", error);
        res.status(500).json({ msg: "Hubo un error en el servidor al crear el envío." });
    }
};

const obtenerEnvioPaquetePorId = async (req, res) => {
    try {
        const { id } = req.params; 

        // Modificación aquí: usa .populate('cliente')
        const envio = await EnvioPaquete.findById(id).populate('cliente', "telefono nombre ");

        if (!envio) {
            return res.status(404).json({ msg: "Envío de paquete no encontrado" });
        }

        res.status(200).json(envio);

    } catch (error) {
        console.error("Error al obtener el envío del paquete por ID:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ msg: "ID de envío inválido" });
        }
        res.status(500).json({ msg: "Hubo un error en el servidor al obtener el envío." });
    }
};

export const marcarPedidoAceptado = async (req, res) => {
    const { id } = req.params; // ID del Envío
const driverId = req.usuario._id; // Asume que el ID del driver viene del token JWT autenticado
    try {
        const envio = await EnvioPaquete.findById(id);

        if (!envio) {
            return res.status(404).json({ msg: "Envío de paquete no encontrado." });
        }

        if (envio.estadoPedido === 'aceptado') {
            return res.status(400).json({ msg: "El envío ya está marcado como 'aceptado'." });
        }
        

        envio.estadoPedido = 'aceptado';
        envio.driverAsignado = driverId; // Asigna el ID del driver que está marcando el envío
        envio.horaAceptacion = new Date();
        await envio.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(envio.cliente);
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens,
                    "¡Envío Aceptado!",
                    `¡Tu driver ha aceptado tu envío de paquete!`,
                    {
                        envioId: envio._id.toString(),
                        status: 'aceptado'
                    }
                );
                console.log(`[envioPaqueteController] Notificación 'aceptado' enviada al cliente para envío ${envio._id}.`);
            } catch (notificationError) {
                console.error(`[envioPaqueteController] Error al enviar notificación 'aceptado' para ${envio._id}:`, notificationError);
            }
        } else {
            console.warn(`[envioPaqueteController] No se encontraron FCM tokens para el cliente ${envio.cliente} del envío ${envio._id}.`);
        }

        res.status(200).json({ msg: "Estado del envío actualizado a 'aceptado' y cliente notificado.", envio });

    } catch (error) {
        console.error("Error al marcar envío como aceptado:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el envío." });
    }
};

export const marcarPedidoEnRecojo = async (req, res) => {
    const { id } = req.params; // ID del Envío
    

    try {
        const envio = await EnvioPaquete.findById(id);

        if (!envio) {
            return res.status(404).json({ msg: "Envío de paquete no encontrado." });
        }

        if (envio.estadoPedido === 'en_recojo') {
            return res.status(400).json({ msg: "El envío ya está marcado como 'en recojo'." });
        }
        if (envio.estadoPedido !== 'aceptado') {
            console.warn(`[marcarPedidoEnRecojo] Intento de marcar el envío ${envio._id} como 'en_recojo' desde un estado inesperado: ${envio.estadoPedido}`);
        }

        envio.estadoPedido = 'en_recojo';
        
        envio.horaLlegadaRecojo = new Date();
        await envio.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(envio.cliente);
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens,
                    "¡Driver en Punto de Recojo!",
                    `¡Tu driver ya está en el punto de recojo (${envio.recojo.direccion}) para tu paquete!`,
                    {
                        envioId: envio._id.toString(),
                        status: 'en_recojo'
                    }
                );
                console.log(`[envioPaqueteController] Notificación 'en_recojo' enviada al cliente para envío ${envio._id}.`);
            } catch (notificationError) {
                console.error(`[envioPaqueteController] Error al enviar notificación 'en_recojo' para ${envio._id}:`, notificationError);
            }
        } else {
            console.warn(`[envioPaqueteController] No se encontraron FCM tokens para el cliente ${envio.cliente} del envío ${envio._id}.`);
        }

        res.status(200).json({ msg: "Estado del envío actualizado a 'en_recojo' y cliente notificado.", envio });

    } catch (error) {
        console.error("Error al marcar envío en recojo:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el envío." });
    }
};

export const marcarPedidoRecogido = async (req, res) => {
    const { id } = req.params; // ID del Envío

    try {
        const envio = await EnvioPaquete.findById(id);

        if (!envio) {
            return res.status(404).json({ msg: "Envío de paquete no encontrado." });
        }

        if (envio.estadoPedido === 'recogido') {
            return res.status(400).json({ msg: "El envío ya está marcado como 'recogido'." });
        }
        if (envio.estadoPedido !== 'en_recojo') {
            console.warn(`[marcarPedidoRecogido] Intento de marcar el envío ${envio._id} como 'recogido' desde un estado inesperado: ${envio.estadoPedido}`);
        }

        envio.estadoPedido = 'recogido';
        envio.horaRecojo = new Date();
        await envio.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(envio.cliente);
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens,
                    "¡Paquete Recogido!",
                    `¡Tu driver recogió tu paquete y se dirige al punto de entrega!`,
                    {
                        envioId: envio._id.toString(),
                        status: 'recogido'
                    }
                );
                console.log(`[envioPaqueteController] Notificación 'recogido' enviada al cliente para envío ${envio._id}.`);
            } catch (notificationError) {
                console.error(`[envioPaqueteController] Error al enviar notificación 'recogido' para ${envio._id}:`, notificationError);
            }
        } else {
            console.warn(`[envioPaqueteController] No se encontraron FCM tokens para el cliente ${envio.cliente} del envío ${envio._id}.`);
        }

        res.status(200).json({ msg: "Estado del envío actualizado a 'recogido' y cliente notificado.", envio });

    } catch (error) {
        console.error("Error al marcar envío recogido:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el envío." });
    }
};

export const marcarPaqueteEnEntrega = async (req, res) => { // Renombrado para claridad
    const { id } = req.params; // ID del Envío

    try {
        const envio = await EnvioPaquete.findById(id);

        if (!envio) {
            return res.status(404).json({ msg: "Envío de paquete no encontrado." });
        }

        if (envio.estadoPedido === 'en_entrega') {
            return res.status(400).json({ msg: "El envío ya está marcado como 'en entrega'." });
        }
        if (envio.estadoPedido !== 'recogido') {
            console.warn(`[marcarPaqueteEnEntrega] Intento de marcar el envío ${envio._id} como 'en_entrega' desde un estado inesperado: ${envio.estadoPedido}`);
        }

        envio.estadoPedido = 'en_entrega'; // Corresponde al estado "en_entrega" en tu esquema
        envio.horaLlegadaDestino = new Date();
        await envio.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(envio.cliente);
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens,
                    "¡Paquete en Destino!",
                    `¡Tu paquete ha llegado al lugar de entrega (${envio.entrega.direccion})!`,
                    {
                        envioId: envio._id.toString(),
                        status: 'en_entrega'
                    }
                );
                console.log(`[envioPaqueteController] Notificación 'en_entrega' enviada al cliente para envío ${envio._id}.`);
            } catch (notificationError) {
                console.error(`[envioPaqueteController] Error al enviar notificación 'en_entrega' para ${envio._id}:`, notificationError);
            }
        } else {
            console.warn(`[envioPaqueteController] No se encontraron FCM tokens para el cliente ${envio.cliente} del envío ${envio._id}.`);
        }

        res.status(200).json({ msg: "Estado del envío actualizado a 'en_entrega' y cliente notificado.", envio });

    } catch (error) {
        console.error("Error al marcar envío en destino:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el envío." });
    }
};

export const marcarPedidoEntregado = async (req, res) => {
    const { id } = req.params; // ID del Envío

    try {
        const envio = await EnvioPaquete.findById(id);

        if (!envio) {
            return res.status(404).json({ msg: "Envío de paquete no encontrado." });
        }

        if (envio.estadoPedido === 'entregado') {
            return res.status(400).json({ msg: "El envío ya está marcado como 'entregado'." });
        }
        if (envio.estadoPedido !== 'en_entrega') {
            console.warn(`[marcarPedidoEntregado] Intento de marcar el envío ${envio._id} como 'entregado' desde un estado inesperado: ${envio.estadoPedido}`);
        }

        envio.estadoPedido = 'entregado';
        envio.horaEntrega = new Date();
        await envio.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(envio.cliente);
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens,
                    "¡Paquete Entregado!",
                    `¡Tu paquete ha sido entregado con éxito! ¡Gracias por tu preferencia!`,
                    {
                        envioId: envio._id.toString(),
                        status: 'entregado'
                    }
                );
                console.log(`[envioPaqueteController] Notificación 'entregado' enviada al cliente para envío ${envio._id}.`);
            } catch (notificationError) {
                console.error(`[envioPaqueteController] Error al enviar notificación 'entregado' para ${envio._id}:`, notificationError);
            }
        } else {
            console.warn(`[envioPaqueteController] No se encontraron FCM tokens para el cliente ${envio.cliente} del envío ${envio._id}.`);
        }

        res.status(200).json({ msg: "Envío de paquete entregado exitosamente y cliente notificado.", envio });

    } catch (error) {
        console.error("Error al marcar envío como entregado:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el envío." });
    }
};

export {
    crearEnvioPaquete,
    obtenerEnvioPaquetePorId
};