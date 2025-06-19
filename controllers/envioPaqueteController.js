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

const obtenerEnviosSinDriver = async (req, res) => {
    try {
        // Busca envíos donde el campo 'driver' (o como lo hayas nombrado) sea null o no exista
        // Se puede usar $eq: null para buscar tanto valores null como campos que no existen
        // Alternativamente, puedes usar { driver: { $exists: false } } para solo los que no existen
        // o { driver: null } para solo los que son explícitamente null.
        // La opción { driver: null } o { driver: { $in: [null, undefined] } } suele funcionar bien
        // para ambos casos en Mongoose si el campo no tiene `required: true`.
        const enviosSinDriver = await EnvioPaquete.find({ driver: null })
                                                  .populate('cliente', 'nombre telefono email') // Puedes poblar cliente
                                                  .populate('generadoPor', 'nombre email'); // Y también quién lo generó

        if (enviosSinDriver.length === 0) {
            return res.status(404).json({ msg: "No se encontraron envíos sin driver asignado." });
        }

        res.status(200).json(enviosSinDriver);

    } catch (error) {
        console.error("Error al obtener envíos sin driver:", error);
        res.status(500).json({ msg: "Hubo un error en el servidor al obtener los envíos sin driver." });
    }
};

export {
    crearEnvioPaquete,
    obtenerEnvioPaquetePorId
};