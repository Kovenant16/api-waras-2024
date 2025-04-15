import { default as P } from 'pino';
import * as baileys from '@whiskeysockets/baileys';
import axios from 'axios';
import qrcode from 'qrcode-terminal';

const { makeWASocket, DisconnectReason, useMultiFileAuthState } = baileys;

export async function startSock() {
    console.log('🟢 Iniciando sesión de WhatsApp...');
    const { state, saveCreds } = await useMultiFileAuthState('auth');

    const sock = makeWASocket({
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
        if (remoteJid.endsWith('@g.us')) return;

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

                if (localResponse.status === 200 && localResponse.data) {
                    const local = localResponse.data;
                    const [startLat, startLng] = local.gps.split(',').map(parseFloat);

                    const deliveryResponse = await axios.post(`${process.env.API_URL}/api/pedidos/calcularPrecioDelivery`, {
                        startLocation: { lat: startLat, lng: startLng },
                        endLocation: { lat: latitude, lng: longitude }
                    });

                    if (deliveryResponse.status === 200 && deliveryResponse.data) {
                        const { price } = deliveryResponse.data;

                        await sock.sendMessage(remoteJid, {
                            text: `🤖 *Hola, ${local.nombre}!*  

*Te saluda Waras Bot.*  
El precio del delivery desde ${local.nombre} hasta la ubicación es:  
💰 *S/ ${price}*  

Gracias por elegirnos. ¡Si necesitas algo más, estamos para ayudarte! 😊`
                        });
                    }
                }
            } catch (error) {
                console.error('❌ Error al consultar el local o calcular el precio:', error.message);
            }
        }
    });
}
