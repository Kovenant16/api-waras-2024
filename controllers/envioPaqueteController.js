import EnvioPaquete from "../models/EnvioPaquete.js";

const crearEnvioPaquete = async (req, res) => {
    try {
        // Desestructura todos los campos tal como vienen del frontend
        const {
            pickupAddress,
            pickupLocation,
            pickupReference,
            pickupContactNumber,
            pickupAdditionalDetails,
            deliveryAddress,
            deliveryLocation,
            deliveryReference,
            deliveryContactNumber,
            deliveryAdditionalDetails,
            deliveryCost, // Este es el costoEnvio
            deliveryDistance, // Esta es la distanciaEnvioKm
            paymentMethod, // Este es el medioDePago
            whoPaysDelivery, // Este es quienPagaEnvio
            horaRecojoEstimada,
            notes, // Este es notasPedido
            clientId, // Este es el cliente
            // No necesitas desestructurar "tipoPedido" o "estadoPedido"
            // si los usas con sus valores por defecto, o si el frontend los envía
        } = req.body;

        // Crea una nueva instancia del modelo EnvioPaquete,
        // mapeando explícitamente los campos del frontend a la estructura del modelo.
        const nuevoEnvio = new EnvioPaquete({
            // Información general del pedido (directamente desde el frontend o con valores por defecto)
            tipoPedido: "paqueteria", // Asumiendo que siempre es paqueteria
            estadoPedido: "pendiente", // Asumiendo el estado inicial
            costoEnvio: deliveryCost, // Mapeo
            distanciaEnvioKm: deliveryDistance, // Mapeo

            // Mapeo para Recojo (recuerda que tu modelo espera 'referencia', 'telefonoContacto', etc.)
            recojo: {
                direccion: pickupAddress,
                referencia: pickupReference, // Mapeo
                telefonoContacto: pickupContactNumber, // Mapeo
                detallesAdicionales: pickupAdditionalDetails, // Mapeo
                gps: {
                    latitude: pickupLocation['latitude'], // <-- ¡CORRECCIÓN!
        longitude: pickupLocation['longitude'], // <-- ¡CORRECCIÓN!
                },
            },

            // Mapeo para Entrega
            entrega: {
                direccion: deliveryAddress,
                referencia: deliveryReference, // Mapeo
                telefonoContacto: deliveryContactNumber, // Mapeo
                detallesAdicionales: deliveryAdditionalDetails, // Mapeo
                gps: {
                    latitude: deliveryLocation['latitude'], // <-- ¡CORRECCIÓN!
        longitude: deliveryLocation['longitude'], // <-- ¡CORRECCIÓN!
                },
            },

            // Mapeo para los campos del modal de confirmación
            medioDePago: paymentMethod, // Mapeo
            quienPagaEnvio: whoPaysDelivery, // Mapeo
            horaRecojoEstimada: horaRecojoEstimada,
            notasPedido: notes, // Mapeo

            // Mapeo para el cliente (el frontend envía 'clientId', tu modelo espera 'cliente')
            cliente: clientId, // Mapeo
            generadoPor: clientId, // Si 'generadoPor' también es el cliente que hace el pedido
            // driverAsignado, idMensajeTelegram, idTelegram, etc. (se pueden dejar por defecto o manejar después)
        });

        // Guarda el nuevo envío en la base de datos
        const envioGuardado = await nuevoEnvio.save();

        res.status(201).json({
            msg: "Envío de paquete creado exitosamente",
            envio: envioGuardado
        });

    } catch (error) {
        console.error("Error al crear el envío del paquete:", error);
        res.status(500).json({ msg: "Hubo un error en el servidor al crear el envío." });
    }
};

export {
    crearEnvioPaquete
};