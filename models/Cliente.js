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
        codigoPais: { // Nuevo campo para el código de país
            type: String,
            default: '+51' // Puedes establecer un valor por defecto si la mayoría son de un país
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
