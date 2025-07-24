// index.js
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

// 👉 DESCOMENTA ESTA LÍNEA para que el bot de WhatsApp se pueda importar
import { startSock } from './bot/botWhatsapp.js'; 

import http from 'http';
import pedidos from './sockets/pedidos.js';
import { Server as WebsocketServer } from 'socket.io';

// --- NUEVAS IMPORTACIONES PARA FIREBASE ADMIN ---
import admin from 'firebase-admin';
import TraficoRuta from './models/TraficoRuta.js';
// Eliminamos path, fs y fileURLToPath ya que no leeremos un archivo localmente en Render
// import path from 'path';
// import fs from 'fs';
// import { fileURLToPath } from 'url';


// Cargar variables de entorno
dotenv.config();

// Ya no necesitamos __filename y __dirname para leer el archivo JSON de Firebase Admin SDK
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);


// --- Configuración de Cloudinary (mantener) ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- INICIALIZACIÓN DE FIREBASE ADMIN SDK ---
// Carga la clave de servicio de Firebase desde la variable de entorno
if (process.env.FIREBASE_ADMIN_SDK_CONFIG) {
    try {
        // Parsea el JSON que viene de la variable de entorno
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK inicializado correctamente desde variable de entorno.');
    } catch (error) {
        console.error('Error al inicializar Firebase Admin SDK desde variable de entorno:', error);
        // Si el JSON está mal, es un error crítico para las notificaciones
        process.exit(1); 
    }
} else {
    // Si la variable de entorno no está configurada, esto podría ser en desarrollo local
    // o un error en producción.
    console.warn('Advertencia: FIREBASE_ADMIN_SDK_CONFIG no está configurada.');
    // Si estás en producción y esto ocurre, es un problema grave.
    // Podrías inicializar desde un archivo local SOLO para desarrollo.
    // Por ejemplo:
    if (process.env.NODE_ENV !== 'production') {
        try {
            // Asegúrate de tener el archivo serviceAccountKey.json en ./config/
            // y que la ruta sea correcta si lo usas localmente.
            // Si no usas esto en desarrollo, puedes dejar estas líneas comentadas o eliminarlas.
            // import path from 'path'; // Descomentar si usas la carga local
            // import fs from 'fs';     // Descomentar si usas la carga local
            // import { fileURLToPath } from 'url'; // Descomentar si usas la carga local
            // const __filename = fileURLToPath(import.meta.url); // Descomentar si usas la carga local
            // const __dirname = path.dirname(__filename);       // Descomentar si usas la carga local
            // const localServiceAccountPath = path.resolve(__dirname, './config/waras-app-delivery-flutter-firebase-adminsdk-fbsvc-21495591b2.json');
            
            // Verifica si el archivo existe localmente antes de intentar leerlo
            // if (fs.existsSync(localServiceAccountPath)) { // Descomentar si usas la carga local
            //     const serviceAccount = JSON.parse(fs.readFileSync(localServiceAccountPath, 'utf8')); // Descomentar si usas la carga local
            //     admin.initializeApp({ // Descomentar si usas la carga local
            //         credential: admin.credential.cert(serviceAccount) // Descomentar si usas la carga local
            //     }); // Descomentar si usas la carga local
            //     console.log('Firebase Admin SDK inicializado localmente desde archivo.'); // Descomentar si usas la carga local
            // } else { // Descomentar si usas la carga local
            //     console.error('Error: Archivo de clave de servicio local no encontrado en desarrollo.'); // Descomentar si usas la carga local
            // } // Descomentar si usas la carga local
            console.warn('Firebase Admin SDK no inicializado localmente porque no está configurado para ello.'); // Mantener si no usas la carga local en dev
        } catch (localError) {
            console.error('Error al inicializar Firebase Admin SDK localmente desde archivo:', localError);
        }
    } else {
        // En producción, si la variable de entorno no está, es un error fatal.
        console.error('Error FATAL: FIREBASE_ADMIN_SDK_CONFIG no está configurada en producción. Saliendo del proceso.');
        process.exit(1);
    }
}
// --- FIN DE LA INICIALIZACIÓN DE FIREBASE ADMIN SDK ---


const app = express();
app.use(express.json());
app.use(cors());


app.use(async (req, res, next) => {
    const ruta = req.originalUrl.split('?')[0];
    const metodo = req.method;
    const start = process.hrtime.bigint();
    const chunks = [];

    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk, ...args) {
        if (chunk) chunks.push(Buffer.from(chunk));
        return originalWrite.apply(res, [chunk, ...args]);
    };

    res.end = async function (chunk, ...args) {
        if (chunk) chunks.push(Buffer.from(chunk));
        const body = Buffer.concat(chunks);
        const sizeKB = body.length / 1024;
        const duracionMs = Number(process.hrtime.bigint() - start) / 1e6;

        try {
            await TraficoRuta.create({
                ruta,
                metodo,
                tamanoKB: sizeKB,
                duracionMs
            });
        } catch (error) {
            console.error('❌ Error guardando tráfico en MongoDB:', error.message);
        }

        return originalEnd.apply(res, [chunk, ...args]);
    };

    next();
});

app.get('/api/stats/trafico', async (req, res) => {
    try {
        const { desde, hasta, modo } = req.query;

        const fechaDesde = desde ? new Date(desde) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Por defecto: últimas 24h
        const fechaHasta = hasta ? new Date(hasta) : new Date(); // Por defecto: ahora

        let pipeline = [
            {
                $match: {
                    timestamp: {
                        $gte: fechaDesde,
                        $lte: fechaHasta
                    }
                }
            }
        ];

        switch (modo) {
            case 'por-dia':
                pipeline.push({
                    $group: {
                        _id: {
                            dia: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
                        },
                        totalSolicitudes: { $sum: 1 },
                        totalKB: { $sum: "$tamanoKB" },
                        promedioMs: { $avg: "$duracionMs" }
                    }
                });
                break;

            case 'por-hora':
                pipeline.push({
                    $group: {
                        _id: {
                            dia: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                            hora: { $hour: "$timestamp" }
                        },
                        totalSolicitudes: { $sum: 1 },
                        totalKB: { $sum: "$tamanoKB" },
                        promedioMs: { $avg: "$duracionMs" }
                    }
                });
                break;

            case 'top-rutas':
                pipeline.push({
                    $group: {
                        _id: {
                            ruta: "$ruta",
                            metodo: "$metodo"
                        },
                        totalSolicitudes: { $sum: 1 },
                        totalKB: { $sum: "$tamanoKB" },
                        promedioMs: { $avg: "$duracionMs" }
                    }
                });
                pipeline.push({ $sort: { totalSolicitudes: -1 } });
                pipeline.push({ $limit: 5 });
                break;

            default:
                // Agrupación completa por ruta + hora
                pipeline.push({
                    $group: {
                        _id: {
                            dia: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                            hora: { $hour: "$timestamp" },
                            ruta: "$ruta",
                            metodo: "$metodo"
                        },
                        totalSolicitudes: { $sum: 1 },
                        totalKB: { $sum: "$tamanoKB" },
                        promedioMs: { $avg: "$duracionMs" }
                    }
                });
        }

        pipeline.push({ $sort: { "_id.dia": -1, "_id.hora": -1 } });

        const stats = await TraficoRuta.aggregate(pipeline);
        res.json(stats);
    } catch (error) {
        console.error("❌ Error en /api/stats/trafico:", error.message);
        res.status(500).json({ msg: "Error interno" });
    }
});


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
        console.log('Mongo Db conectado en:', process.env.MONGO_URI.split('@')[1] || 'URL no disponible');

        // 👉 DESCOMENTA ESTE BLOQUE DE CÓDIGO para habilitar la inicialización del bot de WhatsApp.
        const connectedSock = await startSock();
        if (connectedSock) {
            console.log('WhatsApp conectado y listo.');
        } else {
            console.error('Error al iniciar la conexión de WhatsApp.');
        }

        const server = http.createServer(app);
        server.on('error', (error) => {
            console.error('Error en el servidor:', error);
            process.exit(1);
        });
        iniciarServidores(server);
    } catch (error) {
        console.error('Error general durante la inicialización:', error);
        process.exit(1); // Añadir salida en caso de error general de inicialización
    }
};

iniciarApp();