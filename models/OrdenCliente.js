import mongoose from "mongoose";

const ordenClienteSchema = mongoose.Schema(
    {
        tipoServicio: {
            type: String,
            enum: ["domicilio", "recojo"],
            
        },
        horaDeseada: {
            type: String,
        },
        tipoPedido: {
            type: String,
            enum: ["app", "express", "paqueteria"],
        },
        cobroTaperLocal: {
            type: Number,
        },
        pedido: [
            {
                producto: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Producto",
                },
                cantidad: {
                    type: Number,
                    required: true,
                    default: 1,
                },
                opcion: {
                    type: String, // Aquí puedes almacenar las opciones del producto
                },
                price: {
                    type: Number, // Precio unitario del producto
                    required: true,
                },
                totalPrice: {
                    type: Number, // Precio total del producto considerando cantidad
                    required: true,
                },
            },
        ],
        
        estado: {
            type: String,
            enum: ["pendiente", "confirmado", "en preparación", "en camino", "entregado", "cancelado"],
            default: "pendiente",
        },
        notasCliente: {
            type: String,
            trim: true,
        },
        repartidor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
        },
        montoDelivery: {
            type: Number,
            required: true,
        },
        montoCobradoApp: {
            type: Number,
            required: true,
        },
        telefono: {
            type: String,
            required: true,
        },
        direccion: {
            type: String,
            required: true,
        },
        coordenadas: {
            type: String,
            required: true,
        },
        metodoDePago: {
            type: String,
            enum: ["efectivo", "plin", "yape"],
            required: true,
        },
        pagaCon: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const OrdenCliente = mongoose.model('OrdenCliente', ordenClienteSchema);

export default OrdenCliente;