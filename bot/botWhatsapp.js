import { default as P } from 'pino';
import * as baileys from '@whiskeysockets/baileys';
import axios from 'axios';
import qrcode from 'qrcode-terminal';

const { makeWASocket, DisconnectReason, useMultiFileAuthState } = baileys;

export let sock = null; // 👉 sock declarado en el scope global

export async function startSock() {
    console.log('🟢 Iniciando sesión de WhatsApp...');
    const { state, saveCreds } = await useMultiFileAuthState('/data');

    sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('🔳 Escanea este QR con tu WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión cerrada. ¿Reconectar?', shouldReconnect);
            if (shouldReconnect) {
                startSock(); // reconectar
            }
        } else if (connection === 'open') {
            console.log('✅ Conectado a WhatsApp');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        if (remoteJid.endsWith('@g.us')) return; // Ignorar mensajes de grupos

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

                const { price, distance } = deliveryResponse.data;
                await sock.sendMessage(remoteJid, {
                    text: `🤖 Hola,
El costo de entrega desde *${local.nombre}* es:  
💰 *S/ ${price}*  
📍 Distancia aprox: *${(distance * 1.2).toFixed(2)} km*

Si estás de acuerdo, estamos listos para programar el pedido.`
                });

                console.log(`✅ Precio enviado a ${local.nombre}: S/ ${price}, Distancia: ${(distance / 1000).toFixed(2)} km`);

            } catch (error) {
                console.error('❌ Error al procesar la solicitud de precio:', error.message);

                let mensajeError = '❌ Hubo un problema al procesar tu solicitud.';
                if (error.response?.status === 400) {
                    mensajeError = `❌ ${error.response.data.msg || 'Error en la solicitud'}`;
                } else if (error.response?.status === 404) {
                    mensajeError = '❌ No encontramos la información necesaria.';
                } else if (error.request) {
                    mensajeError = '❌ No pudimos conectar con nuestros servicios.';
                }

                //await sock.sendMessage(remoteJid, { text: mensajeError });
            }
        }
    });
}

export async function enviarMensajeAsignacion(sockInstance, numero, mensaje) {
    try {
        const numeroFormateado = numero.includes('@s.whatsapp.net')
            ? numero
            : `${numero}@s.whatsapp.net`;

        await sockInstance.sendMessage(numeroFormateado, { text: mensaje });
        console.log(`📤 Mensaje enviado a ${numero}: "${mensaje}"`);
    } catch (error) {
        console.error(`❌ Error al enviar mensaje a ${numero}:`, error.message);
    }
}


