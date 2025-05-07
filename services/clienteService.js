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

    console.log('➡️ Verificando código para:', telefonoConCodigo);
    console.log('Código recibido:', codigo);

    try {
        const query = { telefono: telefonoConCodigo };
        const verificacion = await Verificacion.findOne(query);
        console.log('🔍 Resultado de búsqueda en Verificacion:', verificacion);

        if (!verificacion) {
            return res.status(404).json({ error: 'Código de verificación no encontrado o expirado.' });
        }

        const ahora = new Date();
        console.log('🕒 Fecha actual:', ahora);
        console.log('📅 Fecha de expiración:', verificacion.expireAt);

        if (verificacion.codigo === codigo && verificacion.expireAt > ahora) {
            console.log('✅ Código válido y no expirado.');

            // Buscar el cliente con o sin código de país
            let cliente = await Cliente.findOne({
                $or: [
                    { telefono: telefonoConCodigo },
                    { telefono: telefono }
                ]
            });

            console.log('🔍 Resultado de búsqueda en Cliente:', cliente);

            if (cliente) {
                // Actualizar el teléfono si estaba guardado sin código
                if (cliente.telefono !== telefonoConCodigo) {
                    cliente.telefono = telefonoConCodigo;
                    cliente.codigoPais = codigoPais;
                    await cliente.save();
                    console.log("📌 Cliente actualizado con formato de teléfono unificado.");
                }

                const token = generarToken(cliente._id);
                console.log('🔐 Token generado para cliente existente.');
                res.json({ mensaje: 'Verificación exitosa.', token, cliente });
            } else {
                console.log('🆕 Cliente no encontrado. Intentando crearlo...');
                const nuevoCliente = new Cliente({
                    telefono: telefonoConCodigo,
                    codigoPais: codigoPais,
                    ...req.body
                });

                try {
                    await nuevoCliente.save();
                    const token = generarToken(nuevoCliente._id);
                    console.log('🟢 Nuevo cliente creado y token generado.');
                    res.json({ mensaje: 'Verificación exitosa. Nuevo cliente creado.', token, cliente: nuevoCliente });
                } catch (error) {
                    console.error("❌ Error al crear el cliente:", error);
                    return res.status(500).json({ error: "Error al crear el cliente: " + error.message });
                }
            }

            await Verificacion.deleteOne({ telefono: telefonoConCodigo });
            console.log('🗑️ Código de verificación eliminado.');
        } else {
            console.log('❌ Código inválido o expirado.');
            res.status(400).json({ error: 'Código de verificación incorrecto o expirado.' });
        }
    } catch (error) {
        console.error('💥 Error al verificar código:', error);
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

const editarCliente = async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono, ubicaciones } = req.body;

    try {
        const clienteExistente = await Cliente.findById(id);
        if (!clienteExistente) {
            return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        }

        clienteExistente.nombre = nombre || clienteExistente.nombre;
        clienteExistente.telefono = telefono || clienteExistente.telefono;
        clienteExistente.ubicaciones = ubicaciones || clienteExistente.ubicaciones;

        const clienteActualizado = await clienteExistente.save();

        res.json({ mensaje: 'Cliente actualizado correctamente', cliente: clienteActualizado });
    } catch (error) {
        console.error('Error al editar cliente:', error);
        res.status(500).json({ error: 'Error al editar el cliente: ' + error.message });
    }
};


export { registrarNuevoCliente, verificarCodigoCliente, enviarCodigoVerificacion, editarCliente };
