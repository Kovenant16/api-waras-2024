import Cliente from '../models/Cliente.js';
import Verificacion from '../models/Verificacion.js';
import { enviarCodigoVerificacionWhatsApp } from '../bot/botWhatsapp.js';
import jwt from 'jsonwebtoken';

function generarCodigoVerificacion() {
    return Math.floor(100000 + Math.random() * 900000).toString().substring(0, 4);
}

function generarToken(clienteId) {
    return jwt.sign({ id: clienteId }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
}

const registrarNuevoCliente = async (req, res) => {
    const { telefono, codigoPais, ...otrosDatos } = req.body;
    const telefonoConCodigo = codigoPais + telefono;

    const existeCliente = await Cliente.findOne({ telefono: telefonoConCodigo });
    if (existeCliente) {
        const error = new Error("Cliente existente");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const codigo = generarCodigoVerificacion();
        const expireAt = new Date(Date.now() + 5 * 60 * 1000);

        await Verificacion.findOneAndUpdate(
            { telefono: telefonoConCodigo },
            { codigo, expireAt },
            { upsert: true, setDefaultsOnInsert: true }
        );

        const resultadoEnvio = await enviarCodigoVerificacionWhatsApp(telefonoConCodigo, codigo);
        if (resultadoEnvio.success) {
            res.status(200).json({ mensaje: "Código enviado correctamente" });
        } else {
            console.error('Error al enviar el código de verificación desde el servicio:', resultadoEnvio.message);
            await Verificacion.deleteOne({ telefono: telefonoConCodigo });
            res.status(500).json({ error: 'Hubo un problema al enviar el código de verificación. Por favor, inténtalo de nuevo.' });
        }
    } catch (error) {
        console.log("Error al registrar cliente:", error);
        res.status(500).json({ error: "Error al registrar el cliente: " + error.message });
    }
};

const verificarCodigoCliente = async (req, res) => {
    const { telefono, codigo, codigoPais } = req.body;
    const telefonoConCodigo = codigoPais + telefono;

    try {
        const verificacion = await Verificacion.findOne({ telefono: telefonoConCodigo });

        if (!verificacion) {
            return res.status(404).json({ error: 'Código de verificación no encontrado o expirado.' });
        }

        if (verificacion.codigo === codigo && verificacion.expireAt > new Date()) {
            let cliente = await Cliente.findOne({ telefono: telefonoConCodigo });

            if (!cliente) {
                cliente = await Cliente.create({ telefono: telefonoConCodigo,  ...req.body });
                console.log(`Cliente creado tras verificación: ${telefonoConCodigo}`);
            }

            await Verificacion.deleteOne({ telefono: telefonoConCodigo });

            const token = generarToken(cliente._id);

            res.json({ mensaje: 'Verificación exitosa.', token, cliente });
        } else {
            res.status(400).json({ error: 'Código de verificación incorrecto o expirado.' });
        }
    } catch (error) {
        console.error('Error al verificar código:', error);
        res.status(500).json({ error: 'Error al verificar código: ' + error.message });
    }
};

export async function enviarCodigoVerificacion(telefonoConCodigo, codigo) {
    const mensaje = `Tu código de verificación es: *${codigo}*`;
    let telefonoParaWhatsApp = telefonoConCodigo;

    // Verificar si el número comienza con el código de país (ej, +51)
    if (telefonoParaWhatsApp.startsWith('+')) {
        const codigoPais = telefonoParaWhatsApp.substring(1, telefonoParaWhatsApp.indexOf(telefonoParaWhatsApp[1]));
        telefonoParaWhatsApp = telefonoParaWhatsApp.substring(codigoPais.length + 1); // Eliminar el "+" y el código de país
    }

    const numeroWhatsApp = `${telefonoParaWhatsApp}@s.whatsapp.net`;

    try {
        if (!sock || !isConnected) {
            console.log('⚠️ WhatsApp no conectado. No se puede enviar el código.');
            return { success: false, message: 'WhatsApp no está conectado' };
        }

        await sock.sendMessage(numeroWhatsApp, { text: mensaje });
        console.log(`✅ Código enviado a ${telefonoConCodigo} (${numeroWhatsApp}): ${codigo}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Error al enviar código a ${telefonoConCodigo}:`, error);
        return { success: false, message: 'Error al enviar código: ' + error.message };
    }
}


export { registrarNuevoCliente, verificarCodigoCliente };
