import EnvioPaquete from "../models/EnvioPaquete.js";

const crearEnvioPaquete = async (req, res) => {
    try {
        // Extrae los datos del cuerpo de la solicitud (req.body)
        const {
            tipoPedido,
            costoEnvio,
            distanciaEnvioKm,
            recojo,
            entrega,
            medioDePago,
            quienPagaEnvio,
            horaRecojoEstimada, // Este vendrá del frontend en formato de string "HH:MM"
            notasPedido,
            cliente, // Si viene del frontend y lo mapeas a ObjectId
            generadoPor // Si viene del frontend (ej. un usuario administrador o tienda)
        } = req.body;
        

        // Crea una nueva instancia del modelo EnvioPaquete
        const nuevoEnvio = new EnvioPaquete({
            tipoPedido,
            costoEnvio,
            distanciaEnvioKm,
            recojo: {
                direccion: recojo.direccion,
                referencia: recojo.referencia,
                telefonoContacto: recojo.telefonoContacto,
                detallesAdicionales: recojo.detallesAdicionales,
                gps: {
                    latitude: recojo.gps.latitude,
                    longitude: recojo.gps.longitude,
                },
            },
            entrega: {
                direccion: entrega.direccion,
                referencia: entrega.referencia,
                telefonoContacto: entrega.telefonoContacto,
                detallesAdicionales: entrega.detallesAdicionales,
                gps: {
                    latitude: entrega.gps.latitude,
                    longitude: entrega.gps.longitude,
                },
            },
            medioDePago,
            quienPagaEnvio,
            horaRecojoEstimada, // Se guarda el string "HH:MM" directamente
            notasPedido,
            cliente, // Mongoose se encargará de validar el ObjectId si el ref está configurado
            generadoPor, // Mongoose se encargará de validar el ObjectId
            // estadoPedido y fechaCreacion usarán sus valores por defecto del esquema
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