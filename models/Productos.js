import mongoose from "mongoose";

const opcionUnicaSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    obligatorio:Boolean,
    opciones: [
        {
            nombre: String,
            precio: Number
        }
    ],
    limiteSeleccion: { type: Number, default: 1 } // Límite de selección por defecto para opciones únicas
});

const opcionMultipleSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    obligatorio:Boolean,
    opciones: [
        {
            nombre: String,
            precio: Number
        }
    ],
    limiteSeleccion: { type: Number, default: 1 } // Límite de selección por defecto para opciones múltiples
});



const productoSchema = mongoose.Schema({
    local: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Local",
    },
    nombre: String,
    categoria: String,
    descripcion: String,
    precio:Number,
    cover: String,
    taper:Boolean,
    opcionesUnicas: [opcionUnicaSchema],
    opcionesMultiples: [opcionMultipleSchema],
    disponibilidad: { type: Boolean, default: true },

    

});

const Producto = mongoose.model("Producto", productoSchema);

export default Producto;