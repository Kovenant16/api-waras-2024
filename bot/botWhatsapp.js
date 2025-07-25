import { default as P } from 'pino';
import * as baileys from '@whiskeysockets/baileys';
import axios from 'axios';
import qrcode from 'qrcode-terminal';
import fs from 'fs/promises'; // Importar fs.promises para operaciones de archivos asíncronas
import path from 'path';     // Importar path para manejar rutas

const { makeWASocket, DisconnectReason, useMultiFileAuthState } = baileys;

export let sock = null; // 👉 sock declarado en el scope global
let isConnected = false; // Nueva bandera
let connectionPromiseResolve;

export const isSockConnected = () => isConnected;

// Función para limpiar la carpeta de credenciales
async function clearAuthData(authPath) {
    try {
        const files = await fs.readdir(authPath);
        for (const file of files) {
            await fs.unlink(path.join(authPath, file));
        }
        console.log(`🧹 Carpeta de autenticación (${authPath}) limpiada.`);
    } catch (error) {
        console.error(`❌ Error al limpiar la carpeta de autenticación (${authPath}):`, error);
    }
}


export async function startSock() {
    return new Promise(async (resolve) => {
        connectionPromiseResolve = resolve; // Guardar la función resolve para usarla al conectar

        const AUTH_FILE_PATH = 'data'; // Define la ruta de tu carpeta de autenticación aquí
                                       // Asegúrate de que coincida con lo que configuraste en Render
                                       // ej. 'data' o 'ruta/a/data'

        console.log('🟢 Iniciando sesión de WhatsApp...');
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FILE_PATH);


        sock = makeWASocket({
            logger: P({ level: 'error' }), // Deja en 'debug' o 'info' para depurar
            // printQRInTerminal: true, // COMENTA/ELIMINA ESTA LÍNEA, ya manejas el QR
            auth: state,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => { // Marca como async para usar await en clearAuthData
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('🔳 Escanea este QR con tu WhatsApp:');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                isConnected = false;
                const shouldReconnect =
                    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                console.log('Conexión cerrada. ¿Reconectar?', shouldReconnect);
                console.log('Razón de desconexión:', lastDisconnect?.error?.output?.statusCode || lastDisconnect?.reason);

                if (shouldReconnect) {
                    // Si no es un loggedOut, simplemente intenta reconectar
                    console.log('Intentando reconectar automáticamente...');
                    startSock(); 
                } else {
                    // Si es un loggedOut (sesión inválida), borra credenciales y fuerza nueva sesión
                    console.warn('⚠️ Sesión de WhatsApp terminada (logged out). Limpiando credenciales y forzando nueva sesión...');
                    await clearAuthData(AUTH_FILE_PATH); // Limpia los archivos de sesión
                    startSock(); // Inicia una nueva sesión, que generará un QR
                }
            } else if (connection === 'open') {
                console.log('✅ Conectado a WhatsApp');
                isConnected = true;
                if (connectionPromiseResolve) {
                    connectionPromiseResolve(sock);
                    connectionPromiseResolve = null;
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const remoteJid = msg.key.remoteJid;

            if (remoteJid === 'status@broadcast') return; // ⛔️ Ignorar mensajes de estado del sistema
            if (remoteJid.endsWith('@g.us')) return; // Ignorar mensajes de grupos
            console.log("remote Jid", remoteJid);
            console.log('ℹ️ Estado de la conexión al recibir un mensaje:', isConnected);

            const location = msg.message.locationMessage;
            if (location) {
                const latitude = location.degreesLatitude;
                const longitude = location.degreesLongitude;

                const userPhoneRaw = remoteJid;
                const userPhone = userPhoneRaw.replace('@s.whatsapp.net', '');
                const numeroSinCodigo = userPhone.slice(-9);

                console.log(`📍 Ubicación recibida de ${numeroSinCodigo}: Lat ${latitude}, Long ${longitude}`);

                try {
                    const localResponse = await axios.post(`${process.env.API_URL}/api/pedidos/obtenerLocalPorTelefono`, {
                        telefono: numeroSinCodigo
                    });

                    if (!localResponse.data) {
                        console.log('⚠️ No se encontró el local con el teléfono proporcionado');
                        return;
                    }

                    const local = localResponse.data;

                    if (!local.gps) {
                        console.log(`⚠️ El local ${local.nombre} no tiene coordenadas GPS configuradas`);
                        await sock.sendMessage(remoteJid, {
                            text: `❌ Lo sentimos, no podemos calcular el costo de entrega porque faltan datos de ubicación del local.`
                        });
                        return;
                    }

                    const [startLat, startLng] = local.gps.split(',').map(parseFloat);
                    if (isNaN(startLat) || isNaN(startLng)) {
                        console.log(`⚠️ El local ${local.nombre} tiene coordenadas GPS inválidas`);
                        await sock.sendMessage(remoteJid, {
                            text: `❌ Hay un problema con la ubicación registrada del local.`
                        });
                        return;
                    }

                    const deliveryResponse = await axios.post(`${process.env.API_URL}/api/pedidos/calcularPrecioDeliveryDos`, {
                        startLocation: { lat: startLat, lng: startLng },
                        endLocation: { lat: latitude, lng: longitude }
                    });

                    if (deliveryResponse.data && deliveryResponse.data.hasService === false) {
                        console.log('⚠️ No hay servicio disponible para la ubicación solicitada');
                        await sock.sendMessage(remoteJid, {
                            text: `❌ No podemos ofrecer delivery a esa ubicación: ${deliveryResponse.data.message || 'Fuera de cobertura'}.`
                        });
                        return;
                    }

                    if (!deliveryResponse.data || !deliveryResponse.data.price) {
                        console.log('⚠️ No se pudo calcular el precio del delivery');
                        await sock.sendMessage(remoteJid, {
                            text: `❌ No pudimos calcular el costo de entrega en este momento.`
                        });
                        return;
                    }

                    function capitalizarNombre(nombre) {
                        return nombre.replace(/\b\w/g, letra => letra.toUpperCase());
                    }

                    const { price, distance } = deliveryResponse.data;
                    await sock.sendMessage(remoteJid, {
                        text: `🤖 Hola,
El costo de entrega desde *${capitalizarNombre(local.nombre)}* hasta la ubicación es:  
💰 *S/ ${price}*  
📍 Distancia aprox: *${(distance * 1.2).toFixed(2)} km*

coords:  ${latitude},${longitude}



Si estás de acuerdo, estamos listos para programar el pedido.`
                    });

                    console.log(`✅ Precio enviado a ${local.nombre}: S/ ${price}, Distancia: ${(distance / 1000).toFixed(2)} km`);

                } catch (error) {
    // console.error('❌ Error al procesar la solicitud de precio:', error.message); // <-- Comenta o elimina esta línea

    // ¡Añade o modifica esto para un log más detallado!
    console.error('❌ Error completo al procesar la solicitud de precio:', error);

    let mensajeError = '❌ Hubo un problema al procesar tu solicitud.';
    if (error.response?.status === 400) {
        mensajeError = `❌ ${error.response.data.msg || 'Error en la solicitud'}`;
    } else if (error.response?.status === 404) {
        mensajeError = '❌ No encontramos la información necesaria.';
    } else if (error.request) { // <-- Esto es clave para errores de red
        mensajeError = '❌ No pudimos conectar con nuestros servicios. Verifica la URL de la API y el firewall.';
    } else {
        // Un error inesperado que no tiene response ni request
        mensajeError = `❌ Ocurrió un error inesperado: ${error.message || 'Desconocido'}`;
    }

    await sock.sendMessage(remoteJid, { text: mensajeError }); // Asegúrate de que esta línea esté descomentada para depurar al usuario
}
            }
        });
    });
}

export async function enviarMensajeAsignacion(numero, mensaje) {
    try {
        const numeroFormateado = numero.includes('@s.whatsapp.net')
            ? numero
            : `${numero}@s.whatsapp.net`;

        if (sock && isConnected) { // Verifica si sock está inicializado y conectado
            await sock.sendMessage(numeroFormateado, { text: mensaje });
            console.log(`📤 Mensaje enviado a ${numero}: "${mensaje}"`);
            return { success: true }; // Indica éxito
        } else {
            console.log('⚠️ El socket de WhatsApp no está inicializado o no conectado.');
            return { success: false, message: 'Servicio de WhatsApp no disponible.' };
        }
    } catch (error) {
        console.error(`❌ Error al enviar mensaje a ${numero}:`, error);
        return { success: false, message: 'Error al enviar mensaje: ' + error.message };
    }
}

export async function enviarCodigoVerificacionWhatsApp(telefonoConCodigo, codigo) {

    const mensaje = `*${codigo}* es tu código de verificación Waras Delivery. Por favor, no compartas este código con nadie.`;

    // Formatear el número de teléfono eliminando el '+' y el código de país (si es necesario)

    let telefonoParaWhatsApp = telefonoConCodigo;

    if (telefonoConCodigo.startsWith('+')) {

        telefonoParaWhatsApp = telefonoConCodigo.substring(telefonoConCodigo.indexOf('9'));

    }

    const numeroWhatsApp = `${telefonoParaWhatsApp}@s.whatsapp.net`;



    try {

        if (sock && isConnected) {

            await sock.sendMessage(numeroWhatsApp, { text: mensaje });

            console.log(`✅ Código de verificación enviado a ${telefonoConCodigo} (WhatsApp: ${numeroWhatsApp}): ${codigo}`);

            return { success: true }; // Indica éxito

        } else {

            console.log('⚠️ El socket de WhatsApp no está inicializado o no conectado.');

            return { success: false, message: 'Servicio de WhatsApp no disponible.' };

        }

    } catch (error) {

        console.error(`❌ Error al enviar el código de verificación a ${telefonoConCodigo}:`, error);

        return { success: false, message: 'Error al enviar el código de verificación: ' + error.message };

    }

}



async function generarCodigoVerificacion(longitud = 4) {

    const min = Math.pow(10, longitud - 1);

    const max = Math.pow(10, longitud) - 1;

    return Math.floor(Math.random() * (max - min + 1) + min).toString().padStart(longitud, '0');

}



export async function iniciarLoginCliente(telefonoConCodigo) {

    // Eliminar el "+" y el código de país si están presentes al inicio para el envío por WhatsApp

    let telefonoSinCodigo = telefonoConCodigo;

    const codigoPais = telefonoConCodigo.substring(1, telefonoConCodigo.indexOf('9')); // Asumiendo '+' seguido del código y luego el número

    if (telefonoSinCodigo.startsWith('+')) {

        telefonoSinCodigo = telefonoSinCodigo.substring(1);

    }



    const numeroWhatsApp = `${telefonoSinCodigo}@s.whatsapp.net`;

    const codigoVerificacion = await generarCodigoVerificacion();

    const mensaje = `Tu código de verificación para iniciar sesión en Waras Delivery es: *${codigoVerificacion}*`;



    try {

        if (!sock || !isConnected) {

            console.log('⚠️ No se puede enviar el código de login, socket no conectado.');

            return { success: false, message: 'Servicio de WhatsApp no disponible.' };

        }



        await sock.sendMessage(numeroWhatsApp, { text: mensaje });

        console.log(`✅ Código de login enviado a ${telefonoConCodigo} (${numeroWhatsApp}): ${codigoVerificacion}`);

        return { success: true, codigo: codigoVerificacion, telefono: telefonoConCodigo }; // Devolver el código para verificar después

    } catch (error) {

        console.error('❌ Error al enviar el código de login:', error);

        return { success: false, message: 'Error al enviar el código de verificación.' };

    }

}