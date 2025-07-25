import { default as P } from 'pino';
import * as baileys from '@whiskeysockets/baileys';
import axios from 'axios';
import qrcode from 'qrcode-terminal';
import fs from 'fs/promises'; 
import path from 'path'; 

const { makeWASocket, DisconnectReason, useMultiFileAuthState } = baileys;

export let sock = null; 
let isConnected = false; 
let connectionPromiseResolve;

export const isSockConnected = () => isConnected;

// Mapeo temporal para almacenar el JID real si lo obtenemos de un mensaje de texto
// Esto es una solución básica. En un sistema de producción, usarías una base de datos.
const realJidMap = new Map(); 

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
        connectionPromiseResolve = resolve; 

        const AUTH_FILE_PATH = 'data'; 

        console.log('🟢 Iniciando sesión de WhatsApp...');
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FILE_PATH);


        sock = makeWASocket({
            logger: P({ level: 'error' }), 
            auth: state,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => { 
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
                    console.log('Intentando reconectar automáticamente...');
                    startSock(); 
                } else {
                    console.warn('⚠️ Sesión de WhatsApp terminada (logged out). Limpiando credenciales y forzando nueva sesión...');
                    await clearAuthData(AUTH_FILE_PATH); 
                    startSock(); 
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

            if (remoteJid === 'status@broadcast') return; 
            if (remoteJid.endsWith('@g.us')) return; 
            
            console.log("remote Jid", remoteJid);
            console.log('ℹ️ Estado de la conexión al recibir un mensaje:', isConnected);
            console.log('📦 Mensaje completo recibido (DEBUG):', JSON.stringify(msg, null, 2));

            // --- Lógica para obtener el JID real del remitente ---
            let userRealJid = '';
            let isRealJidFromMap = false;
            let isOriginalRemoteJidLid = remoteJid.endsWith('@lid');

            // 1. Prioritize msg.key.participant if available (most direct for some cases)
            if (msg.key.participant) {
                userRealJid = msg.key.participant;
                console.log(`DEBUG: JID real '${userRealJid}' obtenido de msg.key.participant.`);
            } 
            // 2. If remoteJid is already an @s.whatsapp.net JID, use it directly
            else if (remoteJid && remoteJid.endsWith('@s.whatsapp.net')) {
                userRealJid = remoteJid;
                console.log(`DEBUG: JID real '${userRealJid}' obtenido directamente de remoteJid (@s.whatsapp.net).`);
            }
            // 3. If it's an @lid JID, try to get from map (if previously stored)
            else if (isOriginalRemoteJidLid && realJidMap.has(remoteJid)) {
                userRealJid = realJidMap.get(remoteJid);
                isRealJidFromMap = true;
                console.log(`DEBUG: JID real '${userRealJid}' recuperado del mapa para @lid '${remoteJid}'.`);
            }
            // 4. Fallback for @lid JIDs if still no real JID found: Try to resolve it using getContactById
            if (!userRealJid && isOriginalRemoteJidLid) {
                try {
                    const contact = await sock.getContactById(remoteJid);
                    if (contact && contact.id && contact.id.endsWith('@s.whatsapp.net')) {
                        userRealJid = contact.id;
                        console.log(`DEBUG: JID real '${userRealJid}' resuelto de @lid '${remoteJid}' usando getContactById.`);
                        // Store it in the map for future messages from this @lid JID
                        realJidMap.set(remoteJid, userRealJid);
                    } else {
                        console.log(`DEBUG: getContactById did not resolve real JID for @lid '${remoteJid}'. Contact:`, contact);
                    }
                } catch (e) {
                    console.error(`ERROR: Failed to resolve real JID for @lid '${remoteJid}' using getContactById:`, e.message);
                }
            }
            
            // Determinar si es un mensaje de texto (conversation o extendedTextMessage)
            const isTextMessage = msg.message.conversation || (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text);

            if (isTextMessage) {
                console.log('🚫 Tipo de mensaje: MENSAJE DE TEXTO. Contenido:', isTextMessage);
                
                // La respuesta para el texto es siempre la misma, pidiendo la ubicación.
                // Esto es para que el usuario siempre sepa qué hacer, independientemente del @lid.
                await sock.sendMessage(remoteJid, { text: `¡Hola ${msg.pushName || 'cliente'}! Para calcular el costo de entrega, por favor envíame tu ubicación. 😊` });
                return; // Procesamos el texto y salimos
            }

            const location = msg.message.locationMessage;
            if (location) {
                const latitude = location.degreesLatitude;
                const longitude = location.degreesLongitude;

                // --- INICIO LÓGICA DE EXTRACCIÓN Y VALIDACIÓN DEL NÚMERO PARA API ---
                let numeroParaAPI = '';
                let isValidPhoneNumber = false;

                // Solo intentamos limpiar si userRealJid ya tiene el formato de JID real de WhatsApp.
                if (userRealJid && userRealJid.endsWith('@s.whatsapp.net')) { 
                    let tempPhone = userRealJid.split('@')[0];
                    if (tempPhone.startsWith('51') && tempPhone.length >= 11) { // Asume código de país 51
                        const potentialNumber = tempPhone.substring(2); // Elimina el 51
                        if (!isNaN(potentialNumber) && potentialNumber.length === 9) {
                            numeroParaAPI = potentialNumber;
                            isValidPhoneNumber = true;
                        }
                    } else if (tempPhone.length === 9 && !isNaN(tempPhone)) { // Si ya tiene 9 dígitos y es numérico (sin código de país)
                        numeroParaAPI = tempPhone;
                        isValidPhoneNumber = true;
                    }
                }
                // --- FIN LÓGICA DE EXTRACCIÓN Y VALIDACIÓN DEL NÚMERO PARA API ---

                console.log(`DEBUG: JID procesado para número (Fuente: ${isRealJidFromMap ? 'Mapa de JIDs' : (isOriginalRemoteJidLid ? 'RemoteJid @lid con intento de resolución' : 'Propiedades de mensaje/directo') }): ${userRealJid}`); 
                console.log(`📍 Ubicación recibida de (intentando obtener el número): Lat ${latitude}, Long ${longitude}`);
                console.log(`Teléfono limpio para API (FINAL): ${numeroParaAPI} (Válido: ${isValidPhoneNumber})`); 
                
                if (!isValidPhoneNumber) {
                    console.error(`❌ ERROR: No se pudo obtener un número de teléfono válido de 9 dígitos. JID Real: ${userRealJid}`);
                    await sock.sendMessage(remoteJid, { 
                        text: "❌ Lo siento, no puedo procesar tu solicitud de ubicación. No pude identificar tu número de teléfono real. Para asegurar la identificación, por favor, envíame primero un mensaje de texto como 'Hola' y luego reenvía tu ubicación." 
                    });
                    return; 
                }

                // Si llegamos aquí, numeroParaAPI debería ser un número válido de 9 dígitos
                try {
                    const localResponse = await axios.post(`${process.env.API_URL}/api/pedidos/obtenerLocalPorTelefono`, {
                        telefono: numeroParaAPI 
                    });

                    if (!localResponse.data) {
                        console.log('⚠️ No se encontró el local con el teléfono proporcionado');
                        await sock.sendMessage(remoteJid, {
                            text: `❌ Lo sentimos, no se encontró ningún local asociado a tu número de teléfono. Por favor, asegúrate de estar registrado.`
                        });
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
                    console.error('❌ Error completo al procesar la solicitud de precio:', error);
                    if (error.response?.data) {
                        console.error('Response Data from API (DEBUG):', error.response.data);
                    }

                    let mensajeError = '❌ Hubo un problema al procesar tu solicitud.';
                    if (error.response?.status === 400) {
                        mensajeError = `❌ ${error.response.data.msg || 'Error en la solicitud'}`;
                    } else if (error.response?.status === 404) {
                        mensajeError = '❌ No encontramos la información necesaria. Por favor, asegúrate de que tu número esté registrado en nuestro sistema.';
                    } else if (error.request) {
                        mensajeError = '❌ No pudimos conectar con nuestros servicios. Por favor, intenta de nuevo más tarde.';
                    } else {
                        mensajeError = `❌ Ocurrió un error inesperado: ${error.message || 'Desconocido'}.`;
                    }

                    await sock.sendMessage(remoteJid, { text: mensajeError });
                }
            } else { // Si no es un mensaje de ubicación ni de texto (ej. imagen, video, etc.)
                console.log('🚫 Tipo de mensaje: NO ES UBICACIÓN NI TEXTO. Contenido del mensaje:', JSON.stringify(msg.message, null, 2));
                // Aquí también pedimos el mensaje de texto primero para forzar el mapeo del JID
                await sock.sendMessage(remoteJid, { text: "Hola! Para calcular el costo de entrega, por favor envíame tu ubicación. Si no funciona, por favor, envíame un mensaje de texto primero como 'Hola' y luego reenvía tu ubicación. 😊" });
            }
        });
    });
}

// Las siguientes funciones no necesitan cambios.
export async function enviarMensajeAsignacion(numero, mensaje) {
    try {
        const numeroFormateado = numero.includes('@s.whatsapp.net')
            ? numero
            : `${numero}@s.whatsapp.net`;

        if (sock && isConnected) { 
            await sock.sendMessage(numeroFormateado, { text: mensaje });
            console.log(`📤 Mensaje enviado a ${numero}: "${mensaje}"`);
            return { success: true }; 
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

    let telefonoParaWhatsApp = telefonoConCodigo;

    if (telefonoConCodigo.startsWith('+')) {

        telefonoParaWhatsApp = telefonoConCodigo.substring(telefonoConCodigo.indexOf('9'));

    }

    const numeroWhatsApp = `${telefonoParaWhatsApp}@s.whatsapp.net`;


    try {

        if (sock && isConnected) {

            await sock.sendMessage(numeroWhatsApp, { text: mensaje });

            console.log(`✅ Código de verificación enviado a ${telefonoConCodigo} (WhatsApp: ${numeroWhatsApp}): ${codigo}`);

            return { success: true }; 

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

    let telefonoSinCodigo = telefonoConCodigo;

    const codigoPais = telefonoConCodigo.substring(1, telefonoConCodigo.indexOf('9')); 

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

        return { success: true, codigo: codigoVerificacion, telefono: telefonoConCodigo }; 

    } catch (error) {

        console.error('❌ Error al enviar el código de login:', error);

        return { success: false, message: 'Error al enviar el código de verificación.' };

    }

}