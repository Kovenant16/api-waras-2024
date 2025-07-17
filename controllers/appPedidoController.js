// controllers/appPedidoController.js

import PedidoApp from '../models/PedidoApp.js';
import mongoose from 'mongoose';
import { getNextSequenceAlphanumeric } from '../utils/sequenceGenerator.js'

import { sendNewOrderNotificationToMotorizados, sendNotificationToClient } from '../services/notificationService.js';
import Cliente from '../models/Cliente.js';


// import Usuario from '../models/usuario.js'; // Si necesitas interactuar con el modelo de usuario, impórtalo

const crearPedidoApp = async (req, res) => {
    try {
        // **IMPORTANTE:** Para seguridad, el `userId` debería obtenerse de la sesión del usuario autenticado
        // por ejemplo, si usas JSON Web Tokens (JWT), el `userId` estaría en `req.user._id`
        // Esto asume que tienes un middleware de autenticación que adjunta la información del usuario al objeto `req`.

        // Desestructurar el cuerpo de la solicitud (JSON de Flutter)
        const {
            userId,
            deliveryAddress,
            subtotal,
            deliveryCost,
            totalAmount,
            paymentMethod,
            cashPaymentDetails, // Este campo será undefined si no es efectivo, Mongoose lo manejará.
            notes,
            orderItems,
            orderDate,
            storeDetails
        } = req.body;

        // Validaciones adicionales antes de crear el documento (opcional, Mongoose ya valida mucho)
        if (!deliveryAddress || !orderItems || orderItems.length === 0 || !orderDate || !storeDetails) {
            return res.status(400).json({ msg: "Faltan campos obligatorios para el pedido de la aplicación." });
        }
        if (paymentMethod === 'efectivo' && (!cashPaymentDetails || typeof cashPaymentDetails.paidAmount === 'undefined')) {
            return res.status(400).json({ msg: "Detalles de pago en efectivo incompletos." });
        }

        const nextPedidoNumber = await getNextSequenceAlphanumeric('pedidoAppId', 999);

        // Crear una nueva instancia del modelo PedidoApp
        const nuevoPedidoApp = new PedidoApp({
            numeroPedido: nextPedidoNumber, // Asigna el número de pedido secuencial
            userId, // Asigna el ID del usuario autenticado
            deliveryAddress,
            subtotal,
            deliveryCost,
            totalAmount,
            paymentMethod,
            cashPaymentDetails,
            notes,
            orderItems,
            orderDate,
            storeDetails,
            // `tipoPedido` y `estadoPedido` se establecerán por defecto desde el esquema
        });

        // Guardar el pedido en la base de datos
        const pedidoGuardado = await nuevoPedidoApp.save();


        // --- LÓGICA DE NOTIFICACIÓN DESPUÉS DE CREAR EL PEDIDO ---
        try {
            await sendNewOrderNotificationToMotorizados(
                "¡Nuevo Pedido!", // Título de la notificación
                "Revisa la bandeja de pedidos disponibles. ¡Hay un nuevo pedido!", // Cuerpo de la notificación
                { 
                    orderId: pedidoGuardado._id.toString(), // Datos personalizados para la app
                    numeroPedido: pedidoGuardado.numeroPedido.toString(),
                    // Puedes añadir más datos relevantes aquí si la app los necesita
                },
                {
                    // Opciones FCM adicionales, por ejemplo, prioridad alta
                    priority: 'high', 
                    // timeToLive: 60 * 60 * 24 // 24 horas, si necesitas que la notificación expire
                }
            );
            console.log(`[appPedidoController] Notificación de nuevo pedido enviada a motorizados para pedido ${pedidoGuardado.numeroPedido}.`);
        } catch (notificationError) {
            console.error(`[appPedidoController] Error al enviar notificación de nuevo pedido para ${pedidoGuardado.numeroPedido}:`, notificationError);
            // Decide cómo manejar este error: ¿debes retornar un error 500 al cliente?
            // Generalmente, un fallo en la notificación no debería impedir que el pedido se cree.
            // Podrías registrar el error y continuar.
        }
        // --- FIN LÓGICA DE NOTIFICACIÓN ---

        res.status(201).json({
            msg: "Pedido de la aplicación creado exitosamente",
            pedido: pedidoGuardado,
        });

    } catch (error) {
        console.error("Error al crear el pedido de la aplicación:", error);
        // Manejo de errores de validación de Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: `Error de validación: ${messages.join(', ')}` });
        }
        res.status(500).json({ msg: "Error interno del servidor al crear el pedido de la aplicación." });
    }
};

const obtenerPedidoAppPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "ID de pedido inválido." });
        }

        const pedido = await PedidoApp.findById(id)
            .populate({
                path: 'userId',
                select: '-password -__v -token -codigoPais -pedidos -ubicaciones -createdAt -updatedAt'
            })
            .populate({
                path: 'storeDetails.storeId',
                select: '-__v -ratingPromedio -colaboradores -tipo -habilitado -createdAt -updatedAt -ruta -diasAbiertos -horaInicioFin -horario -tiempoPreparacion -tienda -ubicacion -urlLogo -tags -versionCarta'
            })
            .populate({
                path: 'orderItems.productId',
                select: '-__v -local -descripcion -cover -opciones -opcionesMultiples  -disponibilidad -opcionesUnicas'
            })
            .populate({
                path: 'driver',
                select: '-password -__v -token'
            })
            .exec();

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        res.status(200).json({
            msg: "Pedido obtenido exitosamente",
            pedido,
        });

    } catch (error) {
        console.error("Error al obtener el pedido de la aplicación:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener el pedido de la aplicación." });
    }
};

const obtenerPedidosEnTransito = async (req, res) => {
    try {
        const estadosEnTransito = ["pendiente", "aceptado", "en local", "recogido"];

        const pedidos = await PedidoApp.find({
            estadoPedido: { $in: estadosEnTransito } // Busca pedidos cuyo estado esté en la lista
        })
            .populate({
                path: 'userId',
                select: '-password -__v -token'
            })
            .populate({
                path: 'storeDetails.storeId',
                select: '-__v'
            })
            .populate({
                path: 'orderItems.productId',
                select: '-__v'
            })
            .populate({
                path: 'driver',
                select: '-password -__v -token'
            })
            .sort({ createdAt: -1 }) // Opcional: ordenar por fecha de creación descendente
            .exec();

        res.status(200).json({
            msg: "Pedidos en tránsito obtenidos exitosamente",
            pedidos,
            count: pedidos.length, // Para saber cuántos hay
        });

    } catch (error) {
        console.error("Error al obtener pedidos en tránsito:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener pedidos en tránsito." });
    }
};

const obtenerPedidosPorUsuario = async (req, res) => {
    try {
        // **IMPORTANTE:** El `userId` debe obtenerse del token de autenticación del usuario.
        // No confíes en un `userId` enviado en los parámetros de la URL o el cuerpo de la solicitud,
        // ya que un usuario malicioso podría intentar ver los pedidos de otro.
        const userId = req.user._id; // <--- Asume que `req.user` tiene el ID del usuario autenticado
        // Para pruebas sin autenticación, podrías usar: const userId = req.params.userId;
        // Pero en producción, es crucial usar el ID del usuario autenticado.

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ msg: "ID de usuario inválido o no proporcionado." });
        }

        const estadosEnTransito = ["pendiente", "aceptado", "en local", "recogido"];

        const pedidos = await PedidoApp.find({
            userId: userId,
            estadoPedido: { $in: estadosEnTransito }
        })
            .populate({
                path: 'userId', // Popula el usuario, aunque ya lo tenemos por el filtro, puede ser útil para consistencia
                select: '-password -__v -token'
            })
            .populate({
                path: 'storeDetails.storeId',
                select: '-__v'
            })
            .populate({
                path: 'orderItems.productId',
                select: '-__v'
            })
            .populate({
                path: 'driver',
                select: '-password -__v -token'
            })
            .sort({ createdAt: -1 })
            .exec();

        res.status(200).json({
            msg: `Pedidos del usuario ${userId} en tránsito obtenidos exitosamente`,
            pedidos,
            count: pedidos.length,
        });

    } catch (error) {
        console.error("Error al obtener pedidos por usuario:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener pedidos por usuario." });
    }
};

const obtenerPedidosPorTienda = async (req, res) => {
    try {
        // **IMPORTANTE:** El `storeId` también debería validarse contra la tienda asociada al usuario autenticado (si es un usuario de tienda).
        // Por ahora, lo tomamos del parámetro de la URL.
        const { storeId } = req.params;

        if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
            return res.status(400).json({ msg: "ID de tienda inválido o no proporcionado." });
        }

        // Para la tienda, probablemente querrá ver todos los pedidos, no solo los "en tránsito".
        // Si necesitas solo los en tránsito, puedes añadir la condición de `estadoPedido` aquí también.
        const pedidos = await PedidoApp.find({
            "storeDetails.storeId": storeId, // Filtra por el storeId dentro de storeDetails
        })
            .populate({
                path: 'userId',
                select: '-password -__v -token'
            })
            .populate({
                path: 'storeDetails.storeId', // Aunque ya lo tenemos por el filtro, puede ser útil para consistencia
                select: '-__v'
            })
            .populate({
                path: 'orderItems.productId',
                select: '-__v'
            })
            .populate({
                path: 'driver',
                select: '-password -__v -token'
            })
            .sort({ createdAt: -1 })
            .exec();

        res.status(200).json({
            msg: `Pedidos de la tienda ${storeId} obtenidos exitosamente`,
            pedidos,
            count: pedidos.length,
        });

    } catch (error) {
        console.error("Error al obtener pedidos por tienda:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener pedidos por tienda." });
    }
};

const actualizarPedidoApp = async (req, res) => {
    const { idPedido } = req.params; // ID del pedido a actualizar
    const {
        deliveryAddress,
        subtotal,
        deliveryCost,
        totalAmount,
        paymentMethod,
        cashPaymentDetails,
        notes,
        orderItems,
        orderDate,
        storeDetails
        // No permitir que el estadoPedido o el driver se actualicen aquí directamente
    } = req.body;

    try {
        const pedido = await PedidoApp.findById(idPedido);

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        // Si el pedido ya no está en un estado editable (ej. 'entregado', 'cancelado'), no permitir actualización
        if (['entregado', 'cancelado', 'rechazado'].includes(pedido.estadoPedido)) {
            return res.status(400).json({ msg: "No se puede actualizar un pedido en estado final o rechazado." });
        }

        // Actualizar solo los campos permitidos
        pedido.deliveryAddress = deliveryAddress || pedido.deliveryAddress;
        pedido.subtotal = subtotal || pedido.subtotal;
        pedido.deliveryCost = deliveryCost || pedido.deliveryCost;
        pedido.totalAmount = totalAmount || pedido.totalAmount;
        pedido.paymentMethod = paymentMethod || pedido.paymentMethod;

        // Manejar cashPaymentDetails condicionalmente
        if (paymentMethod && paymentMethod === 'efectivo') {
            if (!cashPaymentDetails || typeof cashPaymentDetails.paidAmount === 'undefined' || typeof cashPaymentDetails.change === 'undefined') {
                return res.status(400).json({ msg: "Detalles de pago en efectivo incompletos." });
            }
            pedido.cashPaymentDetails = cashPaymentDetails;
        } else if (paymentMethod && paymentMethod !== 'efectivo') {
            pedido.cashPaymentDetails = undefined; // Eliminar si el método de pago cambia a no-efectivo
        }

        pedido.notes = notes !== undefined ? notes : pedido.notes; // Permitir notes vacío
        pedido.orderItems = orderItems || pedido.orderItems;
        pedido.orderDate = orderDate || pedido.orderDate;
        pedido.storeDetails = storeDetails || pedido.storeDetails;

        const pedidoActualizado = await pedido.save();

        res.status(200).json({ msg: "Pedido actualizado correctamente.", pedido: pedidoActualizado });

    } catch (error) {
        console.error("Error al actualizar el pedido:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: `Error de validación: ${messages.join(', ')}` });
        }
        res.status(500).json({ msg: "Error interno del servidor al actualizar el pedido." });
    }
};

const cancelarPedidoApp = async (req, res) => {
    const { idPedido } = req.params; // ID del pedido a cancelar
    // Opcional: Obtener el ID del usuario que intenta cancelar (req.user._id)
    // para verificar permisos (ej. solo el cliente o un admin puede cancelar)

    try {
        const pedido = await PedidoApp.findById(idPedido).populate('userId'); // Popula el usuario para notificar

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        // Solo permitir cancelación si el pedido no está en estado final o ya cancelado
        if (['entregado', 'cancelado', 'rechazado'].includes(pedido.estadoPedido)) {
            return res.status(400).json({ msg: `El pedido ya está en estado ${pedido.estadoPedido} y no puede ser cancelado.` });
        }

        const oldEstado = pedido.estadoPedido;
        pedido.estadoPedido = 'cancelado';
        pedido.driver = null; // Desasignar cualquier driver si lo hubiera
        await pedido.save();

        // Notificar al cliente que su pedido ha sido cancelado
        if (pedido.userId && pedido.userId._id) {
            await sendPushNotificationToClient(
                pedido.userId._id.toString(),
                `Pedido #${pedido.numeroPedido} Cancelado`,
                `Tu pedido ha sido cancelado. Disculpa las molestias.`,
                { type: 'order_cancelled', orderId: pedido._id.toString(), numeroPedido: pedido.numeroPedido }
            );
            console.log(`Notificación de cancelación enviada al cliente ${pedido.userId._id}.`);
        }

        // Aquí podrías añadir lógica para notificar a la tienda o al driver si estaba asignado

        res.status(200).json({ msg: "Pedido cancelado exitosamente.", pedido: pedido });

    } catch (error) {
        console.error("Error al cancelar el pedido:", error);
        res.status(500).json({ msg: "Error interno del servidor al cancelar el pedido." });
    }
};

const actualizarEstadoPedido = async (req, res) => {
    const { idPedido } = req.params;
    const { nuevoEstado } = req.body;

    // Puedes añadir una validación aquí para que solo estados válidos puedan ser pasados
    const estadosValidos = [
        "aceptado", "en local", "recogido", "entregado", "rechazado",
        // 'sin asignar' y 'pendiente' son estados iniciales, no se setean así directamente aquí
    ];
    if (!estadosValidos.includes(nuevoEstado)) {
        return res.status(400).json({ msg: "Estado de pedido inválido." });
    }

    try {
        // Popula el usuario y el driver para notificaciones
        const pedido = await PedidoApp.findById(idPedido).populate('userId').populate('driver');

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        const estadoAnterior = pedido.estadoPedido;

        // Validaciones de transición de estado (ej. no puedes pasar de 'entregado' a 'aceptado')
        // Puedes hacer esto más complejo según tus reglas de negocio
        if (estadoAnterior === 'entregado' || estadoAnterior === 'cancelado' || estadoAnterior === 'rechazado') {
            return res.status(400).json({ msg: `El pedido ya está en estado final: ${estadoAnterior}. No se puede cambiar.` });
        }
        if (nuevoEstado === 'aceptado' && estadoAnterior !== 'pendiente' && estadoAnterior !== 'sin asignar') {
            return res.status(400).json({ msg: "Solo se puede aceptar un pedido pendiente o sin asignar." });
        }
        // ... más validaciones de transición ...

        pedido.estadoPedido = nuevoEstado;

        // Si el estado cambia a 'rechazado', desasignar driver
        if (nuevoEstado === 'rechazado') {
            pedido.driver = null;
            // Aquí podrías notificar al driver que el pedido fue rechazado/desasignado
        }

        await pedido.save();

        // --- Lógica de Notificaciones FCM basada en el nuevo estado ---
        let title = "";
        let body = "";
        let data = { type: 'order_status_update', orderId: pedido._id.toString(), numeroPedido: pedido.numeroPedido, newStatus: nuevoEstado };
        let sendToClient = false;
        let sendToDriver = false; // Puedes añadir notificaciones al driver si su estado cambia

        switch (nuevoEstado) {
            case 'aceptado':
                title = `¡Pedido #${pedido.numeroPedido} Aceptado por la tienda! 🎉`;
                body = `Tu pedido de ${pedido.storeDetails.storeName || 'la tienda'} ha sido aceptado y está siendo procesado.`;
                sendToClient = true;
                break;
            case 'en local':
                title = `¡Pedido #${pedido.numeroPedido} en Tienda! 🛍️`;
                body = `Tu pedido de ${pedido.storeDetails.storeName || 'la tienda'} está listo para ser recogido por el motorizado.`;
                sendToClient = true;
                // Notificar al driver si ya está asignado y va en camino al local
                break;
            case 'recogido':
                title = `¡Pedido #${pedido.numeroPedido} en Camino! 🛵`;
                body = `¡Tu pedido ya fue recogido por el motorizado y está en camino!`;
                sendToClient = true;
                break;
            case 'entregado':
                title = `¡Pedido #${pedido.numeroPedido} Entregado! ✅`;
                body = `Tu pedido de ${pedido.storeDetails.storeName || 'la tienda'} ha sido entregado. ¡Disfrútalo!`;
                sendToClient = true;
                // Lógica de finalización para el driver (ej. marcar como disponible)
                break;
            case 'rechazado':
                title = `Pedido #${pedido.numeroPedido} Rechazado 😞`;
                body = `Lamentamos informarte que tu pedido ha sido rechazado por la tienda.`;
                sendToClient = true;
                break;
            default:
                break;
        }

        if (sendToClient && pedido.userId && pedido.userId._id) {
            await sendPushNotificationToClient(
                pedido.userId._id.toString(),
                title,
                body,
                data
            );
            console.log(`Notificación de estado '${nuevoEstado}' enviada a cliente ${pedido.userId._id}.`);
        }

        res.status(200).json({ msg: `Estado del pedido actualizado a '${nuevoEstado}' exitosamente.`, pedido });

    } catch (error) {
        console.error("Error al actualizar el estado del pedido:", error);
        res.status(500).json({ msg: "Error interno del servidor." });
    }
};

const asignarDriverPedido = async (req, res) => {
    const { idPedido } = req.params;
    const { idDriver } = req.body; // El ID del driver a asignar

    try {
        const pedido = await PedidoApp.findById(idPedido).populate('userId');
        const driver = await Usuario.findById(idDriver); // Asumo que el driver es un tipo de Usuario

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }
        if (!driver || driver.role !== 'driver') { // Valida que sea un driver real
            return res.status(404).json({ msg: "Driver no encontrado o no válido." });
        }

        // Validaciones: El pedido debe estar en un estado asignable y no tener ya un driver
        if (['aceptado', 'en local', 'recogido', 'entregado', 'cancelado', 'rechazado'].includes(pedido.estadoPedido) || pedido.driver) {
            return res.status(400).json({ msg: `El pedido está en estado '${pedido.estadoPedido}' o ya tiene un driver asignado.` });
        }

        pedido.driver = driver._id;
        pedido.estadoPedido = 'aceptado'; // O 'en_proceso_asignacion', según tu flujo
        await pedido.save();

        // Notificar al cliente que su pedido ha sido aceptado por un driver
        if (pedido.userId && pedido.userId._id) {
            await sendPushNotificationToClient(
                pedido.userId._id.toString(),
                `¡Tu pedido #${pedido.numeroPedido} ha sido asignado! 🛵`,
                `El motorizado ${driver.nombre} ha aceptado tu pedido y está en camino a la tienda.`,
                { type: 'order_assigned', orderId: pedido._id.toString(), numeroPedido: pedido.numeroPedido, driverName: driver.nombre }
            );
            console.log(`Notificación de asignación enviada a cliente ${pedido.userId._id}.`);
        }

        // Notificar al driver que se le ha asignado el pedido (si su token FCM está en el modelo Usuario)
        // Esto asume que tienes un método similar a sendPushNotificationToClient para drivers
        // if (driver.fcmToken) { // O si es un array de tokens
        //     await sendPushNotificationToDriver(driver._id.toString(), "Nuevo Pedido Asignado", `Se te ha asignado el pedido #${pedido.numeroPedido}.`, { orderId: pedido._id.toString() });
        // }


        res.status(200).json({ msg: `Pedido ${pedido.numeroPedido} asignado al driver ${driver.nombre}.`, pedido: pedido });

    } catch (error) {
        console.error("Error al asignar driver al pedido:", error);
        res.status(500).json({ msg: "Error interno del servidor." });
    }
};

const obtenerPedidosDriver = async (req, res) => {
    // Asumo que el ID del driver se obtiene del token de autenticación
    const driverId = req.user._id; // O como sea que obtengas el ID del driver autenticado

    try {
        const pedidos = await PedidoApp.find({ driver: driverId })
                                       .populate('userId') // Para mostrar información del cliente
                                       .populate('storeDetails.storeId') // Para mostrar información de la tienda
                                       .sort({ createdAt: -1 }); // Los más recientes primero

        if (pedidos.length === 0) {
            return res.status(200).json({ msg: "No tienes pedidos asignados actualmente.", pedidos: [] });
        }

        res.status(200).json({ msg: "Pedidos asignados encontrados.", pedidos: pedidos });

    } catch (error) {
        console.error("Error al obtener pedidos para el driver:", error);
        res.status(500).json({ msg: "Error interno del servidor." });
    }
};

const obtenerPedidosSinDriver = async (req, res) => {

    console.log("Obteniendo pedidos sin driver asignado...");
    try {
        let query = {
            driver: null, // Pedidos que no tienen un driver asignado
            estadoPedido: { $in: ['pendiente', 'sin asignar', 'aceptado'] } // Estados que pueden ser tomados
        };

        // Buscar pedidos que no tienen driver asignado
        // Popula userId y storeDetails.storeId para obtener la información necesaria
        // Ordena por createdAt: 1 para priorizar los pedidos más antiguos/recientes según tu lógica (1 para ascendente, -1 para descendente)
        let pedidos = await PedidoApp.find(query)
                                    .populate('userId', 'nombre email telefono') // Solo traer los campos necesarios del cliente
                                    .populate({
                                        path: 'storeDetails.storeId',
                                        select: 'nombre gps' // Solo traer los campos necesarios del local
                                    })
                                    .sort({ createdAt: 1 }); // Los más antiguos primero (para priorizar)
        
        // No hay lógica de ordenamiento por cercanía si no se envían lat/lng del driver.
        // Se mantiene el ordenado por fecha de creación.

        if (pedidos.length === 0) {
            return res.status(200).json({ msg: "No hay pedidos sin driver disponibles en este momento.", pedidos: [] });
        }

        res.status(200).json({ msg: "Pedidos sin driver encontrados.", pedidos: pedidos });

    } catch (error) {
        console.error("Error al obtener pedidos sin driver:", error);
        res.status(500).json({ msg: "Error interno del servidor." });
    }
};

const tomarPedido = async (req, res) => {
    const { idPedido } = req.params;
    const driverId = req.user._id; // ID del driver que está autenticado y quiere tomar el pedido

    try {
        // Buscar el pedido y asegurarse de que no tiene driver y está en un estado tomable
        const pedido = await PedidoApp.findOneAndUpdate(
            {
                _id: idPedido,
                driver: null, // Que no tenga driver asignado
                estadoPedido: { $in: ['pendiente', 'sin asignar'] } // Que esté en un estado 'tomable'
            },
            {
                $set: {
                    driver: driverId,
                    estadoPedido: 'aceptado' // Una vez tomado, se considera 'aceptado' por el driver
                }
            },
            { new: true } // Devuelve el documento actualizado
        ).populate('userId').populate('driver'); // Popula para notificaciones

        if (!pedido) {
            return res.status(400).json({ msg: "El pedido no está disponible para ser tomado (ya asignado, en estado inválido, o no existe)." });
        }

        // Notificar al cliente que su pedido ha sido tomado
        if (pedido.userId && pedido.userId._id && pedido.driver) {
            await sendPushNotificationToClient(
                pedido.userId._id.toString(),
                `¡Tu pedido #${pedido.numeroPedido} ha sido tomado! 🛵`,
                `El motorizado ${pedido.driver.nombre || 'asignado'} está en camino a la tienda.`,
                { type: 'order_taken', orderId: pedido._id.toString(), numeroPedido: pedido.numeroPedido, driverName: pedido.driver.nombre || 'Asignado' }
            );
            console.log(`Notificación de pedido tomado enviada al cliente ${pedido.userId._id}.`);
        }

        // Opcional: Notificar a la tienda que el pedido ha sido tomado por un driver

        res.status(200).json({ msg: `Has tomado el pedido ${pedido.numeroPedido} exitosamente.`, pedido: pedido });

    } catch (error) {
        console.error("Error al tomar el pedido:", error);
        res.status(500).json({ msg: "Error interno del servidor." });
    }
};

export const obtenerUltimosPedidosApp = async (req, res) => {
    try {
        // IMPORTANTE: Recuerda obtener el userId de forma segura, preferiblemente desde req.user._id
        const userId = req.params.userId; 

        if (!userId) {
            return res.status(400).json({ msg: "El ID de usuario es obligatorio para obtener los pedidos." });
        }

        const ultimosPedidos = await PedidoApp.find({ userId })
            .sort({ createdAt: -1 }) // Ordenar por fecha de creación descendente
            .limit(3) // Limitar a los 3 pedidos más recientes
            .populate({
                path: 'orderItems.productId',
                select: 'nombre -_id' // Solo selecciona el nombre del producto, excluyendo su _id
            })
            .populate({
                path: 'storeDetails.storeId',
                select: 'nombre -_id' // Solo selecciona el nombre de la tienda, excluyendo su _id
            })
            .select(
                '_id orderDate totalAmount estadoPedido orderItems.quantity' + // Campos directos
                ' storeDetails.storeId' // Asegura que storeDetails.storeId se incluye para la población
            );

        // Mapear los resultados para obtener el formato deseado
        const pedidosSimplificados = ultimosPedidos.map(pedido => {
            return {
                id: pedido._id, // Utiliza el _id del pedido como 'id'
                date: pedido.orderDate.toISOString().split('T')[0], // Formatea la fecha a 'YYYY-MM-DD'
                store: pedido.storeDetails.storeId.nombre, // Accede al nombre de la tienda populada
                total: pedido.totalAmount,
                status: pedido.estadoPedido,
                items: pedido.orderItems.map(item => ({
                    quantity: item.quantity,
                    productName: item.productId.nombre // Accede al nombre del producto populado
                }))
            };
        });

        res.status(200).json({
            msg: "Últimos 3 pedidos del usuario obtenidos y simplificados exitosamente",
            pedidos: pedidosSimplificados,
        });

    } catch (error) {
        console.error("Error al obtener y simplificar los pedidos de la aplicación:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener los pedidos." });
    }
};

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

export const marcarPedidoAppAceptado = async (req, res) => {
    const { id } = req.params; // ID del Pedido

    try {
        const pedido = await PedidoApp.findById(id);

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        if (pedido.estadoPedido === 'driver_asignado') {
            return res.status(400).json({ msg: "El pedido ya está marcado como 'driver_asignado'." });
        }
        

        pedido.estadoPedido = 'driver_asignado';
        pedido.horaAceptacion = new Date();
        await pedido.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(pedido.userId); // Obtener todos los tokens
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens, // Pasar el array de tokens
                    "¡Pedido aceptado!",
                    `Un driver acepto tu pedido, pronto se estará comunicando contigo.`,
                    {
                        orderId: pedido._id.toString(),
                        numeroPedido: pedido.numeroPedido.toString(),
                        status: 'driver asignado'
                    }
                );
                console.log(`[appPedidoController] Notificación 'aceptado' enviada al cliente para pedido ${pedido.numeroPedido}.`);
            } catch (notificationError) {
                console.error(`[appPedidoController] Error al enviar notificación 'aceptado' para ${pedido.numeroPedido}:`, notificationError);
            }
        } else {
            console.warn(`[appPedidoController] No se encontraron FCM tokens para el cliente ${pedido.userId} del pedido ${pedido.numeroPedido}.`);
        }

        res.status(200).json({ msg: "Estado del pedido actualizado a 'driver_asignado' y cliente notificado.", pedido });

    } catch (error) {
        console.error("Error al marcar pedido en tienda:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el pedido." });
    }
};

export const marcarPedidoAppEnTienda = async (req, res) => {
    const { id } = req.params; // ID del Pedido

    try {
        const pedido = await PedidoApp.findById(id);

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        if (pedido.estadoPedido === 'en_tienda') {
            return res.status(400).json({ msg: "El pedido ya está marcado como 'en tienda'." });
        }
        

        pedido.estadoPedido = 'en_tienda';
        pedido.horaLlegadaRecojo = new Date();
        await pedido.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(pedido.userId); // Obtener todos los tokens
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens, // Pasar el array de tokens
                    "¡Driver en tienda!",
                    `Tu motorizado ha llegado a la tienda y está esperando tu pedido.`,
                    {
                        orderId: pedido._id.toString(),
                        numeroPedido: pedido.numeroPedido.toString(),
                        status: 'en_tienda'
                    }
                );
                console.log(`[appPedidoController] Notificación 'en_tienda' enviada al cliente para pedido ${pedido.numeroPedido}.`);
            } catch (notificationError) {
                console.error(`[appPedidoController] Error al enviar notificación 'en_tienda' para ${pedido.numeroPedido}:`, notificationError);
            }
        } else {
            console.warn(`[appPedidoController] No se encontraron FCM tokens para el cliente ${pedido.userId} del pedido ${pedido.numeroPedido}.`);
        }

        res.status(200).json({ msg: "Estado del pedido actualizado a 'en_tienda' y cliente notificado.", pedido });

    } catch (error) {
        console.error("Error al marcar pedido en tienda:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el pedido." });
    }
};

export const marcarPedidoAppRecogido = async (req, res) => {
    const { id } = req.params; // ID del Pedido

    try {
        const pedido = await PedidoApp.findById(id);

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        if (pedido.estadoPedido === 'recogido') {
            return res.status(400).json({ msg: "El pedido ya está marcado como 'recogido'." });
        }
        if (pedido.estadoPedido !== 'en_tienda') {
            console.warn(`[marcarPedidoAppRecogido] Intento de marcar el pedido ${pedido.numeroPedido} como 'recogido' desde un estado inesperado: ${pedido.estadoPedido}`);
        }

        pedido.estadoPedido = 'recogido';
        pedido.horaRecojo = new Date();
        await pedido.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(pedido.userId);
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens,
                    "¡Pedido en Camino!",
                    `¡Tu motorizado ya recogió tu pedido, y se dirige hacia ti!`,
                    {
                        orderId: pedido._id.toString(),
                        numeroPedido: pedido.numeroPedido.toString(),
                        status: 'recogido'
                    }
                );
                console.log(`[appPedidoController] Notificación 'recogido' enviada al cliente para pedido ${pedido.numeroPedido}.`);
            } catch (notificationError) {
                console.error(`[appPedidoController] Error al enviar notificación 'recogido' para ${pedido.numeroPedido}:`, notificationError);
            }
        } else {
            console.warn(`[appPedidoController] No se encontraron FCM tokens para el cliente ${pedido.userId} del pedido ${pedido.numeroPedido}.`);
        }

        res.status(200).json({ msg: "Estado del pedido actualizado a 'recogido' y cliente notificado.", pedido });

    } catch (error) {
        console.error("Error al marcar pedido recogido:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el pedido." });
    }
};

export const marcarPedidoEnDestino = async (req, res) => {
    const { id } = req.params; // ID del Pedido

    try {
        const pedido = await PedidoApp.findById(id);

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        if (pedido.estadoPedido === 'en_destino') {
            return res.status(400).json({ msg: "El pedido ya está marcado como 'en destino'." });
        }
        if (pedido.estadoPedido !== 'recogido') {
            console.warn(`[marcarPedidoEnDestino] Intento de marcar el pedido ${pedido.numeroPedido} como 'en_destino' desde un estado inesperado: ${pedido.estadoPedido}`);
        }

        pedido.estadoPedido = 'en_destino';
        pedido.horaLlegadaDestino = new Date();
        await pedido.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(pedido.userId);
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens,
                    "¡Tu Pedido Llegó!",
                    `¡Tu motorizado ya está en tu dirección (${pedido.deliveryAddress.fullAddress}) con tu pedido #${pedido.numeroPedido}! Por favor, recibelo.`,
                    {
                        orderId: pedido._id.toString(),
                        numeroPedido: pedido.numeroPedido.toString(),
                        status: 'en_destino'
                    }
                );
                console.log(`[appPedidoController] Notificación 'en_destino' enviada al cliente para pedido ${pedido.numeroPedido}.`);
            } catch (notificationError) {
                console.error(`[appPedidoController] Error al enviar notificación 'en_destino' para ${pedido.numeroPedido}:`, notificationError);
            }
        } else {
            console.warn(`[appPedidoController] No se encontraron FCM tokens para el cliente ${pedido.userId} del pedido ${pedido.numeroPedido}.`);
        }

        res.status(200).json({ msg: "Estado del pedido actualizado a 'en_destino' y cliente notificado.", pedido });

    } catch (error) {
        console.error("Error al marcar pedido en destino:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el pedido." });
    }
};

export const marcarPedidoAppEntregado = async (req, res) => {
    const { id } = req.params; // ID del Pedido

    try {
        const pedido = await PedidoApp.findById(id);

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        if (pedido.estadoPedido === 'entregado') {
            return res.status(400).json({ msg: "El pedido ya está marcado como 'entregado'." });
        }
        if (pedido.estadoPedido !== 'en_destino') {
            console.warn(`[marcarEntregado] Intento de marcar el pedido ${pedido.numeroPedido} como 'entregado' desde un estado inesperado: ${pedido.estadoPedido}`);
        }

        pedido.estadoPedido = 'entregado';
        pedido.horaEntrega = new Date();
        await pedido.save();

        // Enviar notificación FCM al cliente
        const clientFcmTokens = await getClientFcmTokens(pedido.userId);
        if (clientFcmTokens.length > 0) {
            try {
                await sendNotificationToClient(
                    clientFcmTokens,
                    "¡Pedido Entregado!",
                    `¡Tu pedido, ha sido entregado con éxito! ¡Esperamos verte de nuevo pronto!`,
                    {
                        orderId: pedido._id.toString(),
                        numeroPedido: pedido.numeroPedido.toString(),
                        status: 'entregado'
                    }
                );
                console.log(`[appPedidoController] Notificación 'entregado' enviada al cliente para pedido ${pedido.numeroPedido}.`);
            } catch (notificationError) {
                console.error(`[appPedidoController] Error al enviar notificación 'entregado' para ${pedido.numeroPedido}:`, notificationError);
            }
        } else {
            console.warn(`[appPedidoController] No se encontraron FCM tokens para el cliente ${pedido.userId} del pedido ${pedido.numeroPedido}.`);
        }

        res.status(200).json({ msg: "Pedido entregado exitosamente y cliente notificado.", pedido });

    } catch (error) {
        console.error("Error al marcar pedido como entregado:", error);
        res.status(500).json({ msg: "Error interno del servidor al actualizar el pedido." });
    }
};

export const getPedidosActivosPorUsuario = async (req, res) => {
    try {
        // En un entorno de producción, el userId debería venir del token de autenticación
        // para asegurar que un usuario solo pueda ver sus propios pedidos.
        // Por ahora, lo obtenemos de los parámetros de la URL como lo solicitaste.
        const { userId } = req.params; // Asume que la ruta será /api/clientes/:userId/pedidos-activos

        // Validar que el userId sea un ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ msg: "ID de usuario inválido." });
        }

        // Estados que queremos EXCLUIR
        const estadosExcluidos = ['entregado', 'cancelado'];

        // Buscar pedidos para el userId dado y que NO estén en los estados excluidos
        const pedidos = await PedidoApp.find({
            userId: userId,
            estadoPedido: { $nin: estadosExcluidos } // $nin significa "not in"
        })
        .populate({
            path: 'orderItems.productId', // Popula el campo productId dentro de cada orderItem
            select: 'nombre' // Solo selecciona el campo 'nombre' del producto
        })
        .populate({
            path: 'storeDetails.storeId', // Popula el campo storeId dentro de storeDetails
            select: 'nombre latitud longitud' // Selecciona los campos de la tienda
        })
        .populate({
            path: 'userId', // Popula el campo userId
            select: 'nombre email telefono' // Selecciona los campos del cliente si los necesitas
        })
        .select('-__v -createdAt -updatedAt') // Excluir campos internos de Mongoose
        .lean(); // Usar .lean() para obtener objetos JavaScript planos, más rápidos para lectura

        if (!pedidos || pedidos.length === 0) {
            return res.status(404).json({ msg: "No se encontraron pedidos activos para este usuario." });
        }

        // Formatear los pedidos para que coincidan con la estructura de tu dummydata de Flutter
        const pedidosFormateados = pedidos.map(pedido => {
            // Mapear orderItems para incluir productName
            const orderItemsFormateados = pedido.orderItems.map(item => ({
                productId: item.productId ? item.productId._id : null,
                productName: item.productId ? item.productId.nombre : 'Producto Desconocido',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalItemPrice: item.totalItemPrice,
                selectedOptions: item.selectedOptions // Esto ya es un array de objetos
            }));

            // Mapear storeDetails para incluir storeName, storeLat, storeLng
            let storeName = "Tienda Desconocida";
            let storeLat = 0.0;
            let storeLng = 0.0;
            if (pedido.storeDetails && pedido.storeDetails.storeId) {
                storeName = pedido.storeDetails.storeId.nombre;
                storeLat = pedido.storeDetails.storeId.latitud;
                storeLng = pedido.storeDetails.storeId.longitud;
            }

            return {
                orderId: pedido._id, // Mapea _id a orderId
                userId: pedido.userId ? pedido.userId._id : null, // Mapea userId populado
                deliveryAddress: {
                    name: pedido.deliveryAddress.name,
                    fullAddress: pedido.deliveryAddress.fullAddress,
                    gps: pedido.deliveryAddress.gps,
                    reference: pedido.deliveryAddress.reference,
                },
                numeroPedido: pedido.numeroPedido,
                subtotal: pedido.subtotal,
                deliveryCost: pedido.deliveryCost,
                totalAmount: pedido.totalAmount,
                paymentMethod: pedido.paymentMethod,
                cashPaymentDetails: pedido.cashPaymentDetails,
                notes: pedido.notes,
                orderItems: orderItemsFormateados,
                orderDate: pedido.orderDate, // Formato ISO para fechas
                storeDetails: {
                    storeId: pedido.storeDetails.storeId ? pedido.storeDetails.storeId._id : null,
                    storeName: storeName,
                    storeLat: storeLat,
                    storeLng: storeLng,
                },
                status: pedido.estadoPedido, // Mapea estadoPedido a 'status'
                estadoTienda: pedido.estadoTienda, // Mantener si lo necesitas
                estadoPedido: pedido.estadoPedido, // Mantener si lo necesitas
                driver: pedido.driver ? pedido.driver : null, // Si el driver está populado, puedes añadir más detalles
                horaLlegadaRecojo: pedido.horaLlegadaRecojo ? pedido.horaLlegadaRecojo : null,
                horaRecojo: pedido.horaRecojo ? pedido.horaRecojo : null,
                horaLlegadaDestino: pedido.horaLlegadaDestino ? pedido.horaLlegadaDestino : null,
                horaEntrega: pedido.horaEntrega ? pedido.horaEntrega : null,
                idMensajeTelegram: pedido.idMensajeTelegram,
                idTelegram: pedido.idTelegram,
                porcentPago: pedido.porcentPago,
                createdAt: pedido.createdAt, // Si usas timestamps
                updatedAt: pedido.updatedAt // Si usas timestamps
            };
        });

        res.status(200).json(pedidosFormateados);

    } catch (error) {
        console.error("Error al obtener pedidos activos de la aplicación:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener pedidos activos." });
    }
};











export { crearPedidoApp, obtenerPedidosPorTienda, obtenerPedidosPorUsuario, obtenerPedidosEnTransito, obtenerPedidoAppPorId ,obtenerPedidosSinDriver };