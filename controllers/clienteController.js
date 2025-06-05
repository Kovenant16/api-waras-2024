import Cliente from "../models/Cliente.js";
import Verificacion from "../models/Verificacion.js";
import { sock, isSockConnected } from '../bot/botWhatsapp.js'; // Importa la instancia sock

const generarCodigoVerificacion = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

const enviarCodigoDeVerificacion = async (telefono) => {
    const codigo = generarCodigoVerificacion();
    const mensaje = `Tu código de verificación para Waras Delivery es: *${codigo}*`;

    try {
        // Guardar el código en la base de datos
        await Verificacion.findOneAndUpdate(
            { telefono },
            { codigo },
            { upsert: true, setDefaultsOnInsert: true } // Si no existe, lo crea con el tiempo de expiración
        );

        // Formatear el número para WhatsApp simplemente añadiendo el dominio
        const numeroWhatsApp = `${telefono}@s.whatsapp.net`;

        if (sock) {
            console.log('Estado de la conexión antes de enviar:', sock.authState.connectionState);
            await sock.sendMessage(numeroWhatsApp, { text: mensaje });
            console.log(`✅ Código de verificación enviado a ${telefono} (WhatsApp: ${numeroWhatsApp}): ${codigo}`);
            await sock.sendMessage(numeroWhatsApp, { text: 'Este es un mensaje de prueba.' }); 
        } else {
            console.log('⚠️ El socket de WhatsApp no está inicializado.');
            // Considera una forma de manejar esto
        }

    } catch (error) {
        console.error('❌ Error al guardar o enviar el código de verificación:', error);
        throw error;
    }
};

const registrarCliente = async (req, res) => {
    const { telefono, ...otrosDatos } = req.body; // Extrae el teléfono y el resto de los datos

    const existeCliente = await Cliente.findOne({ telefono });
    if (existeCliente) {
        const error = new Error("Cliente existente");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const cliente = new Cliente({ telefono, ...otrosDatos });
        await cliente.save();

        if (!sock) {
            console.error('Error: El socket de WhatsApp no se ha inicializado.');
            return res.status(503).json({ msg: 'Servicio de WhatsApp no disponible en este momento (socket no inicializado).' });
        }

        await enviarCodigoDeVerificacion(telefono);
        res.status(201).json({ msg: 'Cliente registrado. Se ha enviado un código de verificación a tu WhatsApp.', clienteId: cliente._id });

    } catch (error) {
        console.log("Error al registrar cliente:", error);
        res.status(500).json({ msg: 'Error al registrar el cliente y/o enviar el código.' });
    }
};

const buscarClientesPorTelefono = async (req, res) => {
    const { telefono } = req.body;

    const clientes = await Cliente.find({ telefono });

    res.json(clientes);
};

const verificarCodigoCliente = async (req, res) => {
    const { telefono, codigo } = req.body;

    try {
        const verificacion = await Verificacion.findOne({ telefono });

        if (!verificacion) {
            return res.status(404).json({ msg: 'Código no encontrado o teléfono incorrecto.' });
        }

        if (verificacion.codigo === codigo) {
            await Verificacion.deleteOne({ telefono }); // Eliminar el código después de la verificación
            // Aquí podrías actualizar el estado del cliente a "verificado" en tu tabla de clientes si lo deseas
            res.json({ msg: 'Cuenta verificada exitosamente.' });
        } else {
            res.status(400).json({ msg: 'El código de verificación es incorrecto.' });
        }

    } catch (error) {
        console.error('Error al verificar el código:', error);
        res.status(500).json({ msg: 'Error al verificar el código.' });
    }
};

export const registerOrUpdateFcmToken = async (req, res) => {
    const { clienteId } = req.params;
    const { fcmToken, deviceId, platform } = req.body;

    if (!fcmToken) {
        return res.status(400).json({ msg: "FCM Token es requerido." });
    }

    try {
        const cliente = await Cliente.findById(clienteId);

        if (!cliente) {
            return res.status(404).json({ msg: "Cliente no encontrado." });
        }

        let tokenExists = false;
        // Buscar si el token ya existe en el array fcmTokens del cliente
        // Si usas deviceId, puedes buscar por deviceId Y token para ser más preciso.
        // Si el token es único globalmente, buscarlo por token es suficiente.
        cliente.fcmTokens = cliente.fcmTokens.map(t => {
            if (t.token === fcmToken) {
                tokenExists = true;
                // Actualizar la marca de tiempo y otros datos si el token ya existe
                return {
                    ...t.toObject(), // Convertir a objeto JS plano para modificar
                    lastRegisteredAt: new Date(),
                    deviceId: deviceId || t.deviceId, // Actualizar si se proporciona, mantener el viejo si no
                    platform: platform || t.platform, // Actualizar si se proporciona, mantener el viejo si no
                };
            }
            return t;
        });

        if (!tokenExists) {
            // Si el token no existe, añadirlo al array
            cliente.fcmTokens.push({
                token: fcmToken,
                deviceId: deviceId,
                platform: platform,
                lastRegisteredAt: new Date(),
            });
        }

        await cliente.save();
        res.status(200).json({ msg: "FCM Token registrado/actualizado exitosamente." });

    } catch (error) {
        // Manejo de errores, por ejemplo, si el token ya existe en otro cliente (debido a unique: true en el schema)
        if (error.code === 11000) { // Error de duplicidad de Mongoose
            // Esto puede ocurrir si un token que está marcado como `unique: true`
            // ya existe en la colección en otro documento.
            // Para FCM tokens, esto es deseable para asegurar que cada token es único globalmente.
            // Si un token se reasigna a un nuevo usuario, el antiguo usuario debería perderlo primero.
            // En un caso real, esto puede requerir lógica adicional para desvincularlo primero.
            console.error("FCM Token ya existe en la base de datos (posiblemente para otro cliente):", fcmToken);
            return res.status(409).json({ msg: "Este FCM Token ya está registrado." });
        }
        console.error("Error al registrar/actualizar FCM Token:", error);
        res.status(500).json({ msg: "Error del servidor al registrar/actualizar FCM Token." });
    }
};

export const removeFcmToken = async (req, res) => {
    const { clienteId } = req.params;
    const { fcmToken } = req.body; // Se espera el token a eliminar en el body

    if (!fcmToken) {
        return res.status(400).json({ msg: "FCM Token es requerido para la eliminación." });
    }

    try {
        const cliente = await Cliente.findById(clienteId);

        if (!cliente) {
            return res.status(404).json({ msg: "Cliente no encontrado." });
        }

        // Filtrar el array para remover el token especificado
        const initialLength = cliente.fcmTokens.length;
        cliente.fcmTokens = cliente.fcmTokens.filter(t => t.token !== fcmToken);

        if (cliente.fcmTokens.length === initialLength) {
            // Si la longitud no cambió, el token no fue encontrado
            return res.status(404).json({ msg: "FCM Token no encontrado para este cliente." });
        }

        await cliente.save();
        res.status(200).json({ msg: "FCM Token desvinculado exitosamente." });

    } catch (error) {
        console.error("Error al desvincular FCM Token:", error);
        res.status(500).json({ msg: "Error del servidor al desvincular FCM Token." });
    }
};

export { registrarCliente, buscarClientesPorTelefono, verificarCodigoCliente, removeFcmToken, registerOrUpdateFcmToken };