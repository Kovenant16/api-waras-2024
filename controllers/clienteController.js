import Cliente from "../models/Cliente.js";
import Verificacion from "../models/Verificacion.js";
import { sock } from '../bot/botWhatsapp.js'; // Importa la instancia sock

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

        const numeroFormateado = telefono.startsWith('+51') ? telefono.substring(3) : telefono;
        const numeroWhatsApp = `+51${numeroFormateado}@s.whatsapp.net`;

        if (sock) {
            await sock.sendMessage(numeroWhatsApp, { text: mensaje });
            console.log(`✅ Código de verificación enviado a ${telefono}: ${codigo}`);
        } else {
            console.log('⚠️ El socket de WhatsApp no está inicializado.');
            // Considera una forma de manejar esto, como guardar el mensaje para enviarlo luego
        }

    } catch (error) {
        console.error('❌ Error al guardar o enviar el código de verificación:', error);
        throw error; // Re-lanza el error para que el controlador lo maneje
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
        const cliente = new Cliente({ telefono, ...otrosDatos }); // Crea un nuevo cliente con los datos
        await cliente.save();

        await enviarCodigoDeVerificacion(telefono);
        res.status(201).json({ msg: 'Cliente registrado. Se ha enviado un código de verificación a tu WhatsApp.', clienteId: cliente._id }); // Devuelve un código 201 (creado) y el ID del cliente
    } catch (error) {
        console.log("Error al registrar cliente:", error);
        res.status(500).json({ msg: 'Error al registrar el cliente.' });
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

export { registrarCliente, buscarClientesPorTelefono, verificarCodigoCliente };