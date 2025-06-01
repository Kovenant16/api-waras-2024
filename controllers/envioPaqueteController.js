import EnvioPaquete from "../models/EnvioPaquete.js";

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
            estadoPedido: "pendiente",
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