import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import { v2 as cloudinary } from 'cloudinary';
import conectarDB from './config/db.js';
import usuarioRoutes from "./routes/usuarioRoutes.js";
import pedidoRoutes from "./routes/pedidoRoutes.js";
import localRoutes from "./routes/localRoutes.js";
import clienteRoutes from "./routes/clienteRoutes.js";
import productoRoutes from "./routes/productoRoutes.js";
import categoriaRoutes from "./routes/categoriaRoutes.js";
import ordenesClienteRoutes from "./routes/ordenesClienteRoutes.js";
import asistenciaRoutes from "./routes/asistenciaRoutes.js";
import ventaRoutes from "./routes/ventaRoutes.js";
import cloudinaryRoutes from './routes/cloudinaryRoutes.js';
import envioPaqueteRoutes from './routes/envioPaqueteRoutes.js';
import appPedidoRoutes from './routes/appPedidoRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

import { startSock } from './bot/botWhatsapp.js';

import http from 'http';
import pedidos from './sockets/pedidos.js';
import { Server as WebsocketServer } from 'socket.io';

// --- NUEVAS IMPORTACIONES PARA FIREBASE ADMIN ---
import admin from 'firebase-admin';
import path from 'path'; // Para manejar rutas de archivos
import fs from 'fs'; // Para leer el archivo JSON de la clave de servicio
import { fileURLToPath } from 'url'; // Para __dirname en módulos ES6

// Cargar variables de entorno
dotenv.config();

// Para usar __dirname con módulos ES6 (necesario si estás en type: "module" en package.json)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// --- Configuración de Cloudinary (mantener) ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- INICIALIZACIÓN DE FIREBASE ADMIN SDK ---
// Carga la clave de servicio de Firebase desde el archivo JSON
// Asegúrate de que la ruta sea correcta y que el archivo esté seguro (ej. en .gitignore)
try {
    // La ruta relativa al archivo JSON de tu clave de servicio
    // Por ejemplo: si guardaste el archivo en una carpeta 'config' en la raíz: './config/serviceAccountKey.json'
    const serviceAccountPath = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || './config/serviceAccountKey.json');
    
    // Leer el archivo JSON de la clave de servicio
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK inicializado correctamente.');
} catch (error) {
    console.error('Error al inicializar Firebase Admin SDK:', error);
    // Es crítico para las notificaciones, así que puedes salir del proceso si falla
    process.exit(1); 
}
// --- FIN DE LA INICIALIZACIÓN DE FIREBASE ADMIN SDK ---


const app = express();
app.use(express.json());
app.use(cors());

// --- Tus rutas existentes (mantener) ---
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/locales", localRoutes);
app.use("/api/clientes", clienteRoutes); // Aquí es donde probablemente ya tienes tus rutas de cliente
app.use("/api/tienda", productoRoutes);
app.use("/api/categoria", categoriaRoutes);
app.use("/api/ordenes", ordenesClienteRoutes);
app.use("/api/asistencia", asistenciaRoutes);
app.use("/api/ventas", ventaRoutes);
app.use('/api/cloudinary',cloudinaryRoutes);
app.use('/api/envioPaquete', envioPaqueteRoutes);
app.use('/api/appPedidos', appPedidoRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 4000;

const iniciarServidores = (httpServer) => {
    httpServer.listen(PORT, () => {
        console.log('Servidor corriendo en el puerto', PORT);
    });

    const io = new WebsocketServer(httpServer, {
        pingTimeout: 60000,
        cors: {
            origin: '*'
        },
    });
    pedidos(io);
};

const iniciarApp = async () => {
    try {
        await conectarDB();
        const connectedSock = await startSock();
        if (connectedSock) {
            console.log('WhatsApp conectado y listo.');
            const server = http.createServer(app);
            server.on('error', (error) => {
                console.error('Error en el servidor:', error);
                process.exit(1);
            });
            iniciarServidores(server);
        } else {
            console.error('Error al iniciar la conexión de WhatsApp.');
        }
    } catch (error) {
        console.error('Error general durante la inicialización:', error);
        process.exit(1); // Añadir salida en caso de error general de inicialización
    }
};

iniciarApp();