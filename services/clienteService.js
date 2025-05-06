// clienteService.js
//import Cliente from '../models/Cliente.js';
import Cliente from '../models/Cliente.js';
import Verificacion from '../models/Verificacion.js';
import { enviarCodigoVerificacionWhatsApp } from '../bot/botWhatsapp.js'; // Importa la función de envío

function generarCodigoVerificacion() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const registrarNuevoCliente = async (req, res) => {
    const { telefono, ...otrosDatos } = req.body;

    const existeCliente = await Cliente.findOne({ telefono });
    if (existeCliente) {
        const error = new Error("Cliente existente");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const cliente = new Cliente({ telefono, ...otrosDatos });
        await cliente.save();

        const codigo = generarCodigoVerificacion();
        await Verificacion.findOneAndUpdate(
            { telefono },
            { codigo },
            { upsert: true, setDefaultsOnInsert: true }
        );

        const enviado = await enviarCodigoVerificacionWhatsApp(telefono, codigo);
        if (enviado) {
            res.status(201).json({ msg: 'Cliente registrado. Se ha enviado un código de verificación a tu WhatsApp.', clienteId: cliente._id });
        } else {
            console.error('Error al enviar el código de verificación desde el servicio.');
            res.status(500).json({ msg: 'Cliente registrado, pero hubo un problema al enviar el código de verificación.' });
        }

    } catch (error) {
        console.log("Error al registrar cliente:", error);
        res.status(500).json({ msg: 'Error al registrar el cliente.' });
    }
};

export { registrarNuevoCliente };