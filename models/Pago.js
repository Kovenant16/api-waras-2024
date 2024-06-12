import mongoose from "mongoose";

const pagoSchema = mongoose.Schema(
    {
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true,
        },
        monto: {
            type: Number,
            required: true,
        },
        concepto: {
            type: String,
            required: true,
        },
        estado: {
            type: String,
            enum: ["pendiente", "aprobado", "rechazado"],
            default: "pendiente",
        },
        detalles: {
            type: String,
            trim: true,
        },
        fecha: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Pago = mongoose.model("Pago", pagoSchema);
export default Pago;
