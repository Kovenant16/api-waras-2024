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

// Mapeo mejorado para JIDs
const realJidMap = new Map(); 
const phoneToJidMap = new Map(); // Mapeo adicional: teléfono -> JID

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

// Función mejorada para extraer número de teléfono
function extractPhoneNumber(jid) {
    if (!jid) return null;
    
    // Si es un JID normal de WhatsApp
    if (jid.endsWith('@s.whatsapp.net')) {
        let phone = jid.split('@')[0];
        
        // Si tiene código de país 51 (Perú)
        if (phone.startsWith('51') && phone.length >= 11) {
            const number = phone.substring(2);
            if (number.length === 9 && /^\d+$/.test(number)) {
                return number;
            }
        }
        
        // Si ya es un número de 9 dígitos
        if (phone.length === 9 && /^\d+$/.test(phone)) {
            return phone;
        }
    }
    
    return null;
}

// Función para resolver JID @lid a número real
async function resolveRealJid(lidJid, pushName = '') {
    console.log(`🔍 Intentando resolver JID @lid: ${lidJid}`);
    
    // 1. Verificar si ya está en el mapa
    if (realJidMap.has(lidJid)) {
        const cachedJid = realJidMap.get(lidJid);
        console.log(`✅ JID encontrado en caché: ${cachedJid}`);
        return cachedJid;
    }
    
    // 2. Intentar con getContactById
    try {
        const contact = await sock.getContactById(lidJid);
        console.log(`📞 Contacto obtenido:`, contact);
        
        if (contact && contact.id && contact.id.endsWith('@s.whatsapp.net')) {
            realJidMap.set(lidJid, contact.id);
            console.log(`✅ JID resuelto via getContactById: ${contact.id}`);
            return contact.id;
        }
    } catch (e) {
        console.log(`⚠️ getContactById falló para ${lidJid}:`, e.message);
    }
    
    // 3. Intentar obtener información del chat
    try {
        const chatInfo = await sock.getChatInfo(lidJid);
        console.log(`💬 Info del chat:`, chatInfo);
        
        if (chatInfo && chatInfo.id) {
            realJidMap.set(lidJid, chatInfo.id);
            console.log(`✅ JID resuelto via getChatInfo: ${chatInfo.id}`);
            return chatInfo.id;
        }
    } catch (e) {
        console.log(`⚠️ getChatInfo falló para ${lidJid}:`, e.message);
    }
    
    // 4. Como último recurso, solicitar al usuario que envíe un mensaje de texto
    console.log(`❌ No se pudo resolver el JID @lid: ${lidJid}`);
    return null;
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
            // Agregar opciones adicionales para mejor manejo de contactos
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: true,
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

        // Escuchar actualizaciones de contactos
        sock.ev.on('contacts.update', (contacts) => {
            console.log('📱 Contactos actualizados:', contacts.length);
            contacts.forEach(contact => {
                if (contact.id && contact.id.endsWith('@s.whatsapp.net')) {
                    const phone = extractPhoneNumber(contact.id);
                    if (phone) {
                        phoneToJidMap.set(phone, contact.id);
                        console.log(`📞 Mapeado: ${phone} -> ${contact.id}`);
                    }
                }
            });
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const remoteJid = msg.key.remoteJid;

            if (remoteJid === 'status@broadcast') return; 
            if (remoteJid.endsWith('@g.us')) return; 
            
            console.log("🆔 Remote JID:", remoteJid);
            console.log("👤 Push Name:", msg.pushName);
            console.log('ℹ️ Estado de la conexión al recibir un mensaje:', isConnected);
            
            // DEBUG: Log completo del mensaje (solo en desarrollo)
            // console.log('📦 Mensaje completo recibido (DEBUG):', JSON.stringify(msg, null, 2));

            // --- LÓGICA MEJORADA PARA OBTENER EL JID REAL ---
            let userRealJid = '';
            let phoneNumber = '';

            // 1. Si ya es un JID normal de WhatsApp
            if (remoteJid.endsWith('@s.whatsapp.net')) {
                userRealJid = remoteJid;
                phoneNumber = extractPhoneNumber(userRealJid);
                console.log(`✅ JID directo: ${userRealJid}, Teléfono: ${phoneNumber}`);
            }
            // 2. Si hay participant (casos especiales)
            else if (msg.key.participant && msg.key.participant.endsWith('@s.whatsapp.net')) {
                userRealJid = msg.key.participant;
                phoneNumber = extractPhoneNumber(userRealJid);
                console.log(`✅ JID desde participant: ${userRealJid}, Teléfono: ${phoneNumber}`);
            }
            // 3. Si es un JID @lid, intentar resolverlo
            else if (remoteJid.endsWith('@lid')) {
                userRealJid = await resolveRealJid(remoteJid, msg.pushName);
                if (userRealJid) {
                    phoneNumber = extractPhoneNumber(userRealJid);
                    console.log(`✅ JID resuelto desde @lid: ${userRealJid}, Teléfono: ${phoneNumber}`);
                } else {
                    console.log(`❌ No se pudo resolver JID @lid: ${remoteJid}`);
                }
            }

            // Determinar si es un mensaje de texto
            const textContent = msg.message.conversation || 
                               (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text);

            if (textContent) {
                console.log('📝 Mensaje de texto recibido:', textContent);
                
                // Si es un JID @lid y no tenemos el JID real, guardar la asociación cuando llegue el texto
                if (remoteJid.endsWith('@lid') && !userRealJid) {
                    console.log('🔗 Mensaje de texto desde @lid sin resolver, solicitando ubicación...');
                }
                
                await sock.sendMessage(remoteJid, { 
                    text: `¡Hola ${msg.pushName || 'cliente'}! Para calcular el costo de entrega, por favor envíame tu ubicación. 📍😊` 
                });
                return;
            }

            // Procesar mensaje de ubicación
            const location = msg.message.locationMessage;
            if (location) {
                const latitude = location.degreesLatitude;
                const longitude = location.degreesLongitude;

                console.log(`📍 Ubicación recibida: Lat ${latitude}, Long ${longitude}`);
                console.log(`🔑 JID para API: ${userRealJid}`);
                console.log(`📱 Teléfono extraído: ${phoneNumber}`);

                // Validar que tenemos un número de teléfono válido
                if (!phoneNumber || phoneNumber.length !== 9) {
                    console.error(`❌ No se pudo obtener un número válido. JID: ${userRealJid}, Teléfono: ${phoneNumber}`);
                    
                    await sock.sendMessage(remoteJid, { 
                        text: `❌ Lo siento, no puedo procesar tu ubicación. Por favor:\n\n1️⃣ Envíame primero un mensaje de texto (ej: "Hola")\n2️⃣ Luego envía tu ubicación\n\nEsto me ayuda a identificar tu número correctamente. 😊` 
                    });
                    return;
                }

                // Procesar la solicitud de precio
                try {
                    console.log(`🔍 Buscando local con teléfono: ${phoneNumber}`);
                    
                    const localResponse = await axios.post(`${process.env.API_URL}/api/pedidos/obtenerLocalPorTelefono`, {
                        telefono: phoneNumber 
                    });

                    if (!localResponse.data) {
                        console.log('⚠️ No se encontró el local con el teléfono proporcionado');
                        await sock.sendMessage(remoteJid, {
                            text: `❌ No encontramos ningún local registrado con tu número de teléfono (${phoneNumber}).\n\nPor favor, verifica que estés registrado en nuestro sistema. 📞`
                        });
                        return;
                    }

                    const local = localResponse.data;
                    console.log(`🏪 Local encontrado: ${local.nombre}`);

                    if (!local.gps) {
                        console.log(`⚠️ El local ${local.nombre} no tiene coordenadas GPS configuradas`);
                        await sock.sendMessage(remoteJid, {
                            text: `❌ Lo sentimos, no podemos calcular el costo de entrega porque falta la ubicación del local en nuestro sistema. 📍`
                        });
                        return;
                    }

                    const [startLat, startLng] = local.gps.split(',').map(parseFloat);
                    if (isNaN(startLat) || isNaN(startLng)) {
                        console.log(`⚠️ El local ${local.nombre} tiene coordenadas GPS inválidas`);
                        await sock.sendMessage(remoteJid, {
                            text: `❌ Hay un problema con la ubicación registrada del local. 🗺️`
                        });
                        return;
                    }

                    console.log(`🧮 Calculando precio desde [${startLat}, ${startLng}] hasta [${latitude}, ${longitude}]`);

                    const deliveryResponse = await axios.post(`${process.env.API_URL}/api/pedidos/calcularPrecioDeliveryDos`, {
                        startLocation: { lat: startLat, lng: startLng },
                        endLocation: { lat: latitude, lng: longitude }
                    });

                    if (deliveryResponse.data && deliveryResponse.data.hasService === false) {
                        console.log('⚠️ No hay servicio disponible para la ubicación solicitada');
                        await sock.sendMessage(remoteJid, {
                            text: `❌ Lo sentimos, no podemos ofrecer delivery a esa ubicación.\n\n📋 Motivo: ${deliveryResponse.data.message || 'Fuera de cobertura'}`
                        });
                        return;
                    }

                    if (!deliveryResponse.data || !deliveryResponse.data.price) {
                        console.log('⚠️ No se pudo calcular el precio del delivery');
                        await sock.sendMessage(remoteJid, {
                            text: `❌ No pudimos calcular el costo de entrega en este momento. Por favor, intenta más tarde. ⏰`
                        });
                        return;
                    }

                    function capitalizarNombre(nombre) {
                        return nombre.replace(/\b\w/g, letra => letra.toUpperCase());
                    }

                    const { price, distance } = deliveryResponse.data;
                    const distanceKm = (distance * 1.2).toFixed(2);

                    await sock.sendMessage(remoteJid, {
                        text: `🤖 ¡Hola!\n\nEl costo de entrega desde *${capitalizarNombre(local.nombre)}* hasta tu ubicación es:\n\n💰 *S/ ${price}*\n📍 Distancia aprox: *${distanceKm} km*\n\n📍 Coordenadas: ${latitude}, ${longitude}\n\nSi estás de acuerdo, estamos listos para procesar tu pedido. ✅`
                    });

                    console.log(`✅ Precio enviado exitosamente - Local: ${local.nombre}, Precio: S/ ${price}, Distancia: ${distanceKm} km`);

                } catch (error) {
                    console.error('❌ Error completo al procesar la solicitud:', error);
                    
                    let mensajeError = '❌ Hubo un problema al procesar tu solicitud.';
                    
                    if (error.response?.status === 400) {
                        mensajeError = `❌ ${error.response.data.msg || 'Error en la solicitud de datos'}`;
                    } else if (error.response?.status === 404) {
                        mensajeError = '❌ No encontramos la información necesaria. Verifica que tu número esté registrado.';
                    } else if (error.request) {
                        mensajeError = '❌ No pudimos conectar con nuestros servicios. Intenta más tarde.';
                    } else {
                        mensajeError = `❌ Error inesperado: ${error.message || 'Desconocido'}`;
                    }

                    await sock.sendMessage(remoteJid, { text: mensajeError });
                }
            } else {
                // Mensaje que no es texto ni ubicación
                console.log('🚫 Mensaje no soportado (no es texto ni ubicación)');
                await sock.sendMessage(remoteJid, { 
                    text: "👋 ¡Hola! Para calcular el costo de entrega, por favor:\n\n1️⃣ Envíame un mensaje de texto\n2️⃣ Luego comparte tu ubicación 📍\n\nGracias 😊" 
                });
            }
        });
    });
}

// Resto de funciones sin cambios...
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