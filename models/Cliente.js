import mongoose from "mongoose";

const clienteSchema = mongoose.Schema(
    {
        nombre: {
            type: String,
            trim: true,
        },
        telefono: {
            type: String,
        },
        ubicaciones: [
            {
                nombreUbicacion: {
                    type: String,
                },
                gps: {
                    type: String,
                },
                referencia: {
                    type: String,
                },
            },
        ],
        pedidos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Pedido",
            },
        ],
    },
    {
        timestamps: true,
    }
);
const Cliente = mongoose.model("Cliente", clienteSchema);
export default Cliente;
