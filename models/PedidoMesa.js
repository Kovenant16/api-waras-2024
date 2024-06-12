import mongoose from "mongoose";

const pedidoMesaSchema = mongoose.Schema({
    mesa: {
        type: String
    },
    mesero: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario"
    },
    zona: {
        type: String
    },
    pedido: [{
        producto: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Producto"
        },
        cantidad: Number,
        observaciones: String
    }],
    estado: {
        type: String,
        enum: ["en espera", "preparándose", "listo para servir", "servido"]
    },
    cliente: {
        nombre: String,
        numeroComensales: Number,
        // Otros detalles del cliente según sea necesario
    },
    notas: String,
}, { timestamps: true });

const PedidoMesa = mongoose.model("pedidoMesa", pedidoMesaSchema);
export default PedidoMesa;