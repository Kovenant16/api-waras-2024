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
            if (remoteJid.endsWith('@g.us')) return; // Seguir ignorando grupos para este caso de uso
            
            console.log("remote Jid", remoteJid);
            console.log('ℹ️ Estado de la conexión al recibir un mensaje:', isConnected);
            console.log('📦 Mensaje completo recibido (DEBUG):', JSON.stringify(msg, null, 2));

            const location = msg.message.locationMessage;
            if (location) {
                const latitude = location.degreesLatitude;
                const longitude = location.degreesLongitude;

                // --- INICIO DE LA LÓGICA DE EXTRACCIÓN DEL NÚMERO DE TELÉFONO (MÁS EXHAUSTIVA) ---
                let userPhoneNumberJid = '';
                let source = 'unknown'; // Para saber de dónde se obtuvo el JID

                // Prioridad 1: msg.key.participant (para grupos y algunos escenarios de linked devices)
                if (msg.key.participant) {
                    userPhoneNumberJid = msg.key.participant;
                    source = 'msg.key.participant';
                } 
                // Prioridad 2: msg.sender (a veces lo contiene para el remitente real en 1-1)
                else if (msg.sender) {
                    userPhoneNumberJid = msg.sender;
                    source = 'msg.sender';
                }
                // Prioridad 3: msg.participant (otra variante que a veces existe para 1-1 linked devices)
                else if (msg.participant) {
                    userPhoneNumberJid = msg.participant;
                    source = 'msg.participant';
                }
                // Prioridad 4: El remoteJid del mensaje si es un chat individual y no es un @lid
                // Esta condición intenta capturar el caso normal de 1-1 chat sin ser un @lid
                else if (remoteJid && remoteJid.endsWith('@s.whatsapp.net')) {
                    userPhoneNumberJid = remoteJid;
                    source = 'remoteJid (@s.whatsapp.net)';
                }
                // Último recurso: remoteJid, incluso si es un @lid (ya sabemos que es el problemático)
                else {
                    userPhoneNumberJid = remoteJid;
                    source = 'remoteJid (fallback, potentially @lid)';
                }
                
                // Extraemos solo la parte numérica antes del '@'
                let userPhone = userPhoneNumberJid.split('@')[0];

                // Ajuste para el formato de la API:
                let numeroParaAPI = userPhone;
                // Intentamos limpiar si parece un número de Perú con código de país
                if (userPhone.startsWith('51') && userPhone.length >= 11) { // 51 + 9 dígitos
                    // Nos aseguramos que el resto del string sean dígitos para evitar cortar el @lid
                    const potentialNumber = userPhone.substring(2);
                    if (!isNaN(potentialNumber) && potentialNumber.length === 9) { // Solo si son 9 dígitos numéricos
                        numeroParaAPI = potentialNumber;
                    }
                } else if (userPhone.length === 9 && !isNaN(userPhone)) { // Si ya tiene 9 dígitos y es numérico
                    numeroParaAPI = userPhone;
                }
                // Si el userPhone sigue siendo el @lid u otro formato, numeroParaAPI seguirá siendo ese valor

                // --- FIN DE LA LÓGICA DE EXTRACCIÓN DEL NÚMERO DE TELÉFONO (MÁS EXHAUSTIVA) ---

                console.log(`DEBUG: JID procesado para número (Fuente: ${source}): ${userPhoneNumberJid}`);
                console.log(`📍 Ubicación recibida de ${numeroParaAPI}: Lat ${latitude}, Long ${longitude}`);
                console.log(`Teléfono limpio para API (FINAL): ${numeroParaAPI}`); 
                
                // Si el número sigue siendo el ID @lid, podemos agregar una verificación aquí
                // para evitar llamadas a la API con un número incorrecto.
                if (userPhone.endsWith('@lid')) {
                    console.error(`❌ ERROR CRÍTICO: El JID del remitente sigue siendo un ID de dispositivo vinculado (@lid) '${userPhone}'. No se puede obtener el número de teléfono real. Mensaje ignorado.`);
                    await sock.sendMessage(remoteJid, { text: "❌ Lo siento, no puedo procesar tu solicitud. No puedo identificar tu número de teléfono real. Por favor, intenta enviar un mensaje de texto primero o contacta al soporte." });
                    return; // Detiene el procesamiento si el número es incorrecto
                }
                // Puedes agregar aquí una verificación de formato de número de teléfono
                // para Perú (ej. que empiece con 9 y tenga 9 dígitos)
                if (!numeroParaAPI.match(/^\d{9}$/)) { // Verifica si no son exactamente 9 dígitos
                     console.error(`❌ ERROR CRÍTICO: El número de teléfono '${numeroParaAPI}' no tiene el formato esperado (9 dígitos).`);
                     await sock.sendMessage(remoteJid, { text: "❌ Lo siento, no puedo procesar tu solicitud. El formato de tu número de teléfono no es válido." });
                     return;
                }


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
            } else {
                console.log('🚫 Tipo de mensaje: NO ES UBICACIÓN. Contenido del mensaje:', JSON.stringify(msg.message, null, 2));
                await sock.sendMessage(remoteJid, { text: "Hola! Para calcular el costo de entrega, por favor envíame tu ubicación. 😊" });
            }
        });
    });
}

// Las siguientes funciones no necesitan cambios, ya que manejan números que les llegan como argumentos
// y no dependen del parsing de mensajes entrantes.

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