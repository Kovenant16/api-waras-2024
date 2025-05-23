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

import { startSock } from './bot/botWhatsapp.js';

import http from 'http';
import pedidos from './sockets/pedidos.js';
import { Server as WebsocketServer } from 'socket.io';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/usuarios", usuarioRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/locales", localRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/tienda", productoRoutes);
app.use("/api/categoria", categoriaRoutes);
app.use("/api/ordenes", ordenesClienteRoutes);
app.use("/api/asistencia", asistenciaRoutes);
app.use("/api/ventas", ventaRoutes);
app.use('/api/cloudinary',cloudinaryRoutes);
app.use('/api/envioPaquete', envioPaqueteRoutes);

const PORT = process.env.PORT || 4000; // Lee la variable de entorno PORT o usa 4000 si no está definidaaa

const iniciarServidores = (httpServer) => {
    httpServer.listen(PORT, () => {
        console.log('Servidor corriendo en el puerto', PORT);
    });

    const io = new WebsocketServer(httpServer, {
        pingTimeout: 60000,
        cors: {
            origin: '*'
            // origin: ['https://admin.warasdelivery.com', 'https://moto.warasdelivery.com', "http://localhost:5173", "http://192.168.100.5:19000", "http://192.168.100.24:3000", "http://192.168.100.224:5173", "http://localhost:3000", "https://socio.warasdelivery.com", "https://192.168.1.49:8081"]
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
            // Manejar errores de cors antes de iniciar el servidor de socket.io
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
    }
};

iniciarApp();