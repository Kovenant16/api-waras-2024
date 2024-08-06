import mongoose from "mongoose";

const pedidosSchema = mongoose.Schema(
    {
        fecha: {
            type: String,
            required: true,
        },
        hora: {
            type: String,
            required: true,
        },
        local: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Local",
        },
        cliente: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cliente",
        },
        direccion: {
            type: String,
            trim: true,
        },
        gps: {
            type: String,
            trim: true,
        },
        detallePedido: {
            type: String,
        },
        tipoPedido: {
            type: String,
            enum:["express", "compras", "paqueteria", "app"],
            default: "express"
        },
        telefono: {
            type: String,
        },
        cobrar: {
            type: String,
        },
        delivery: {
            type: String,
        },
        comVenta: {
            type: String,
        },
        medioDePago: {
            type: String,
            required: true,
            default: "efectivo",
            enum: ["efectivo", "plin", "yape"],
        },
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
        },
        horaRecojo: {
            type: String,
        },
        horaLlegadaLocal: {
            type: String,
        },
        horaEntrega: {
            type: String,
        },
        estadoPedido: {
            type: String,
            enum: [
                "sin asignar",
                "pendiente",
                "aceptado",
                "en local",
                "recogido",
                "entregado",
                "rechazado",
            ],
            default: "sin asignar",
            trim: true,
        },
        horaCreacion: {
            type: String,
        },
        gpsCreacion: {
            type: String,
        },
        generadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
        },
        idMensajeTelegram: {
            type: Number, // El ID del mensaje en Telegram es un número
            default: null,
        },
        idTelegram: {
            type: String, // El ID del chat en Telegram es una cadena
            default: null,
        },
    },
    {
        timestamps: true,
    }
);


const Pedido = mongoose.model("Pedido", pedidosSchema);
export default Pedido;
