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
        const query = { telefono: telefonoConCodigo };
        const verificacion = await Verificacion.findOne(query);
        if (!verificacion) {
            return res.status(404).json({ error: 'Código de verificación no encontrado o expirado.' });
        }
        const ahora = new Date();
        if (verificacion.codigo === codigo && verificacion.expireAt > ahora) {
            let cliente = await Cliente.findOne({ telefono: telefonoConCodigo });
            if (cliente) {
                const token = generarToken(cliente._id);
                res.json({ mensaje: 'Verificación exitosa.', token, cliente });
            } else {
                cliente = await Cliente.create({ telefono: telefonoConCodigo, ...req.body });
                const token = generarToken(cliente._id);
                res.json({ mensaje: 'Verificación exitosa. Nuevo cliente creado.', token, cliente });
            }
            await Verificacion.deleteOne({ telefono: telefonoConCodigo });

        } else {

            res.status(400).json({ error: 'Código de verificación incorrecto o expirado.' });
        }
    } catch (error) {
        console.error('Error al verificar código:', error);
        res.status(500).json({ error: 'Error al verificar código: ' + error.message });
    }
};



const enviarCodigoVerificacion = async (req, res) => {
    const { telefono, codigoPais } = req.body;
    const telefonoConCodigo = codigoPais + telefono;
    const codigoVerificacion = generarCodigoVerificacion();

    try {
        const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

        await Verificacion.findOneAndUpdate(
            { telefono: telefonoConCodigo },
            { codigo: codigoVerificacion, expireAt },
            { upsert: true, setDefaultsOnInsert: true }
        );

        // Formatear el número para enviar a WhatsApp (eliminar el "+" si existe)
        let telefonoParaWhatsApp = telefonoConCodigo;
        if (telefonoParaWhatsApp.startsWith('+')) {
            telefonoParaWhatsApp = telefonoParaWhatsApp.substring(1);
        }

        const resultadoEnvio = await enviarCodigoVerificacionWhatsApp(telefonoParaWhatsApp, codigoVerificacion);

        if (resultadoEnvio.success) {
            res.json({ mensaje: "Código enviado correctamente" });
        } else {
            res.status(500).json({ error: resultadoEnvio.message });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al enviar el código: " + error.message });
    }
};


export { registrarNuevoCliente, verificarCodigoCliente, enviarCodigoVerificacion };
