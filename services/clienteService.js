import Cliente from '../models/Cliente.js';
import Verificacion from '../models/Verificacion.js';
import { enviarCodigoVerificacionWhatsApp } from '../bot/botWhatsapp.js';

function generarCodigoVerificacion() {
    return Math.floor(100000 + Math.random() * 900000).toString().substring(0, 4); // Código de 4 dígitos
}

const registrarNuevoCliente = async (req, res) => {
    const { telefono, codigoPais, ...otrosDatos } = req.body; // Recibe telefono Y codigoPais
    const telefonoConCodigo = codigoPais + telefono; // Combina para buscar y guardar

    const existeCliente = await Cliente.findOne({ telefono: telefonoConCodigo }); // Busca con el código de país
    if (existeCliente) {
        const error = new Error("Cliente existente");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const codigo = generarCodigoVerificacion();
        const expireAt = new Date(Date.now() + 5 * 60 * 1000); // Expira en 5 minutos

        // Guarda en Verificacion con el teléfono CON código de país
        await Verificacion.findOneAndUpdate(
            { telefono: telefonoConCodigo },
            { codigo, expireAt },
            { upsert: true, setDefaultsOnInsert: true }
        );

        // Llama a la función de envío de WhatsApp con el teléfono CON código de país
        const enviado = await enviarCodigoVerificacionWhatsApp(telefonoConCodigo, codigo);
        if (enviado?.success) { // Verifica la respuesta de la función
            res.status(201).json({
                msg: 'Código de verificación enviado a tu WhatsApp.',
                clienteId: null, // El clienteID se enviará después de la verificación exitosa
            });
        } else {
            console.error('Error al enviar el código de verificación desde el servicio:', enviado?.message);
            res.status(500).json({
                msg:
                    'Cliente registrado, pero hubo un problema al enviar el código de verificación. Por favor, inténtalo de nuevo.',
            });
            // Eliminar el cliente creado para que el usuario pueda registrarse de nuevo.
            await Cliente.deleteOne({ telefono: telefonoConCodigo });

        }
    } catch (error) {
        console.log("Error al registrar cliente:", error);
        res.status(500).json({ msg: 'Error al registrar el cliente: ' + error.message });
    }
};



const verificarCodigoCliente = async (req, res) => {
    const { telefono, codigo, codigoPais } = req.body; // Recibe telefono Y codigoPais
    const telefonoConCodigo = codigoPais + telefono;
    try {
        const verificacion = await Verificacion.findOne({ telefono: telefonoConCodigo });

        if (!verificacion) {
            return res.status(404).json({ msg: 'Código de verificación no encontrado o expirado.' });
        }

        if (verificacion.codigo === codigo && verificacion.expireAt > new Date()) {
            // El código coincide y no ha expirado
            let cliente = await Cliente.findOne({ telefono: telefonoConCodigo });

            if (!cliente) {
                // Si el cliente no existe, lo crea.  Aquí SÍ lo creamos.
                cliente = await Cliente.create({ telefono: telefonoConCodigo });
                console.log(`👤 Nuevo cliente creado tras verificación: ${telefonoConCodigo}`);
            }


            // Eliminar el registro de verificación
            await Verificacion.deleteOne({ telefono: telefonoConCodigo });

            // Generar un token de autenticación (JWT es común)
            const token = generarToken(cliente._id); // Debes implementar esta función

            res.json({ msg: 'Verificación exitosa.  Cliente registrado/logueado.', token, cliente }); //Devuelve el cliente
        } else {
            res.status(400).json({ msg: 'Código de verificación incorrecto o expirado.' });
        }
    } catch (error) {
        console.error('Error al verificar código:', error);
        res.status(500).json({ msg: 'Error al verificar código: ' + error.message });
    }
};

// Función auxiliar para generar un token (debes implementarla según tu configuración de autenticación)
function generarToken(clienteId) {
    // Ejemplo usando jsonwebtoken:
    // import jwt from 'jsonwebtoken';
    // return jwt.sign({ id: clienteId }, process.env.JWT_SECRET, { expiresIn: '30d' });
    return 'TU_TOKEN_GENERADO'; // Reemplaza con tu lógica real de generación de tokens
}

export { registrarNuevoCliente, verificarCodigoCliente };
