import mongoose from "mongoose";

const ventaSchema = mongoose.Schema({
    // Información de la mesa y mesero
    mesa: {
        type: String,
        default: null // Puede ser null si es venta para llevar o delivery
    },
    mesero: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario"
    },
    zona: {
        type: String,
        default: null
    },

    // Detalles del pedido
    pedido: [{
        producto: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Producto"
        },
        cantidad: {
            type: Number,
            required: true
        },
        precioUnitario: {
            type: Number,
            required: true
        },
        subtotal: {
            type: Number,
            required: true
        },
        observaciones: {
            type: String,
            default: ""
        }
    }],

    // Estado del pedido en cocina
    estado: {
        type: String,
        enum: ["en espera", "preparándose", "listo para servir", "servido"],
        default: "en espera"
    },

    // Información del cliente (Opcional)
    cliente: {
        nombre: {
            type: String
        },
        telefono: {
            type: String
        },
        tipoServicio: {
            type: String,
            enum: ["en mesa", "para llevar"],
            required: true
        },
        direccion: {
            type: String,
            default: null
        },
        numeroComensales: {
            type: Number,
            default: 1
        }
    },

    // Detalles de pago
    metodoPago: {
        type: String,
        enum: ["efectivo", "yape", "plin", "tarjeta"],
        required: true
    },
    montoTotal: {
        type: Number,
        required: true
    },
    descuento: {
        type: Number,
        default: 0
    },
    montoPagado: {
        type: Number,
        required: true
    },
    cambio: {
        type: Number,
        default: 0
    },

    // Propina y comprobante
    propina: {
        type: Number,
        default: 0
    },
    comprobante: {
        type: String,
        enum: ["boleta", "factura", "ninguno"],
        default: "ninguno"
    },

    // Notas adicionales
    notas: {
        type: String,
        default: ""
    }
}, { timestamps: true });

const Venta = mongoose.model("Venta", ventaSchema);
export default Venta;
