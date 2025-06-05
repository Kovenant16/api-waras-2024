import mongoose from "mongoose";

// --- Sub-esquema para Ubicaciones ---
// Definimos un esquema separado para la flexibilidad y reusabilidad
const ubicacionSchema = new mongoose.Schema({
    // El nombre de la ubicación, opcional si no se proporciona
    nombreUbicacion: {
        type: String,
        trim: true,
    },    
    direccionCompleta: {
        type: String,
        trim: true,
    },
    gps: {
        type: String,
        // No es 'required: true'. Si se proporciona, validamos su formato.
    },
    // Referencia adicional para la ubicación
    referencia: {
        type: String,
        trim: true,
    },
}, {
    _id: true, // Mongoose añade _id por defecto a los subdocumentos, pero lo hacemos explícito.
    // Esto asegura que cada ubicación en el array tenga su propio ID único.
});

// --- NUEVO Sub-esquema para Tokens FCM ---
const fcmTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true, 
    },
    deviceId: { // Opcional: Si quieres identificar el dispositivo
        type: String,
        trim: true,
        // Puedes hacerlo único por cliente si lo deseas:
        // unique: [true, "Este dispositivo ya está registrado para este cliente"]
        // Pero para eso, la lógica de guardado debe ser más compleja.
    },
    platform: { // Opcional: 'android', 'ios', 'web'
        type: String,
        enum: ['android', 'ios', 'web', 'unknown'], // Restringe los valores posibles
        default: 'unknown',
    },
    lastRegisteredAt: { // Para saber cuándo fue la última vez que este token se registró/actualizó
        type: Date,
        default: Date.now,
    },
}, {
    _id: false, // No necesitamos un _id para cada token en el array, a menos que tengas una razón para ello.
    timestamps: false, // No necesitamos createdAt/updatedAt para cada token si lastRegisteredAt es suficiente.
});

// --- Esquema Principal del Cliente ---
const clienteSchema = mongoose.Schema(
    {
        nombre: {
            type: String,
            trim: true,
            // 'required: true' para el nombre del cliente, si es indispensable.
            // Si el nombre no es obligatorio, remueve esta línea.
        },
        telefono: {
            type: String,
            unique: true, // Asegura que cada teléfono sea único en la colección.
        },
        codigoPais: {
            type: String,
            default: '+51', // Valor por defecto si no se especifica.
        },
        // El array de ubicaciones usa el 'ubicacionSchema' definido arriba.
        // El array en sí es opcional, y sus elementos internos también lo son,
        // a menos que se defina 'required' dentro de 'ubicacionSchema'.
        ubicaciones: [ubicacionSchema],
        // El array de pedidos es opcional y puede estar vacío.
        pedidos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Pedido", // Referencia al modelo 'Pedido'
            },
        ],
        fcmTokens: [fcmTokenSchema], 
    },
    {
        timestamps: true, // Mongoose añadirá 'createdAt' y 'updatedAt' automáticamente.
    }
);

// --- Índices para mejorar el rendimiento de las consultas ---
// Indice para búsquedas rápidas por nombre.
clienteSchema.index({ nombre: 1 });

const Cliente = mongoose.model("Cliente", clienteSchema);
export default Cliente;