// controllers/appPedidoController.js

import PedidoApp from '../models/PedidoApp.js';
// import Usuario from '../models/usuario.js'; // Si necesitas interactuar con el modelo de usuario, impórtalo

const crearPedidoApp = async (req, res) => {
    try {
        // **IMPORTANTE:** Para seguridad, el `userId` debería obtenerse de la sesión del usuario autenticado
        // por ejemplo, si usas JSON Web Tokens (JWT), el `userId` estaría en `req.user._id`
        // Esto asume que tienes un middleware de autenticación que adjunta la información del usuario al objeto `req`.
        const userId = "683680ab346184a8faffd41c"//req.user._id; // <--- Asume que `req.user` existe y tiene `_id` del usuario autenticado

        // Desestructurar el cuerpo de la solicitud (JSON de Flutter)
        const {
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

        // Crear una nueva instancia del modelo PedidoApp
        const nuevoPedidoApp = new PedidoApp({
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

export { crearPedidoApp };