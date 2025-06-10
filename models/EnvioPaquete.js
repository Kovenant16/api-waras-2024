import mongoose from "mongoose";

const envioPaqueteSchema = mongoose.Schema(
    {
        // Información general del pedido
        fechaCreacion: {
            type: Date,
            default: Date.now,
        },
        tipoPedido: {
            type: String,
            enum: ["express", "paqueteria"],
            default: "paqueteria",
        },
        estadoPedido: {
            type: String,
            enum: [
                "pendiente",    // Creado, esperando asignación/confirmación
                "asignado",     // Asignado a un driver
                "en_recojo",    // Driver en camino al punto de recojo
                "recogido",     // Paquete recogido
                "en_camino",    // Paquete en ruta de entrega
                "entregado",    // Paquete entregado
                "cancelado",    // Pedido cancelado
                "rechazado",    // Pedido rechazado por driver o sistema
            ],
            default: "pendiente",
            trim: true,
        },
        // **costoEnvio es el único campo para el precio total del servicio de delivery.**
        costoEnvio: {
            type: Number,
            min: 0,
            // Este campo almacena el '_deliveryCost' de tu frontend, el monto total que el cliente debe pagar.
        },
        distanciaEnvioKm: {
            type: Number,
            min: 0,
        },

        // --- Información de Recojo ---
        recojo: {
            direccion: {
                type: String,
                trim: true,
            },
            referencia: {
                type: String,
                trim: true,
            },
            telefonoContacto: {
                type: String,
                trim: true,
            },
            detallesAdicionales: { // Detalles específicos para el recojo
                type: String,
                trim: true,
            },
            gps: {
                latitude: {
                    type: Number,
                    required: true,
                },
                longitude: {
                    type: Number,
                    required: true,
                },
            },
        },

        // --- Información de Entrega ---
        entrega: {
            direccion: {
                type: String,
                trim: true,
            },
            referencia: {
                type: String,
                trim: true,
            },
            telefonoContacto: {
                type: String,
                trim: true,
            },
            detallesAdicionales: { // Detalles específicos para la entrega
                type: String,
                trim: true,
            },
            gps: {
                latitude: {
                    type: Number,
                    required: true,
                },
                longitude: {
                    type: Number,
                    required: true,
                },
            },
        },

        // --- Nuevos campos desde el modal de confirmación ---
        medioDePago: {
            type: String,
            default: "efectivo",
            enum: ["efectivo", "plin", "yape", "tarjeta", "otro"],
        },
        quienPagaEnvio: {
            type: String,
            enum: ["remitente", "destinatario"], // Opciones para quién paga
        },
        horaRecojoEstimada: {
            type: String, // O puedes usar Date si manejas las fechas/horas de forma más compleja
            trim: true,
            // Aquí almacenarías la hora seleccionada por el usuario (ej. "14:30" o un formato Date)
        },
        notasPedido: { // Para instrucciones generales del pedido
            type: String,
            trim: true,
        },

        // --- Campos relacionados con usuarios y drivers ---
        
        driverAsignado: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            default: null,
        },

        // --- Tiempos y seguimiento (gestionados por el sistema/driver) ---
        horaLlegadaLocalDriver: {
            type: String, // Hora en que el driver llegó al punto de recojo
        },
        horaEntregaEstimada: { // Si tienes un cálculo más preciso del tiempo de entrega total
            type: String,
        },
        horaRealEntrega: {
            type: String, // Hora real en que se entregó el paquete
        },
        
        // --- Integración con Telegram (si aplicable) ---
        idMensajeTelegram: {
            type: Number,
            default: null,
        },
        idTelegram: {
            type: String,
            default: null,
        },
        cliente:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cliente",
        },
        porcentPago: {
            type: Number,
            default: 0.8, // Por ejemplo, 80% para el driver
        },
    },
    {
        timestamps: true,
    }
);

const EnvioPaquete = mongoose.model("EnvioPaquete", envioPaqueteSchema);
export default EnvioPaquete;