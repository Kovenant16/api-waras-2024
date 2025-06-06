// controllers/appPedidoController.js

import PedidoApp from '../models/PedidoApp.js';
import mongoose from 'mongoose';
import { getNextSequence } from '../utils/sequenceGenerator.js'
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

        const nextPedidoNumber = await getNextSequence('pedidoAppId'); // Asume que tienes un método para obtener el siguiente número de pedido

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






export { crearPedidoApp, obtenerPedidosPorTienda, obtenerPedidosPorUsuario, obtenerPedidosEnTransito, obtenerPedidoAppPorId ,obtenerPedidosSinDriver };