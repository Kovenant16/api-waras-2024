import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

const usuarioSchema = mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            trim: true,
        },
        activo: {
            type: Boolean,
            default:false
        },
        password: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        telefono: {
            type: String,
            trim: true,
            unique: true,
        },
        yape: {
            type: String,
            trim: true,
        },
        plin: {
            type: String,
            trim: true,
        },
        urlPerfil: {
            type: String,
            trim: true,
        },
        organizacion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Local",
        },
        whatsapp: {
            type: String,
            trim: true,
        },
        rol: {
            type: String,
            required: true,
            enum: [
                "motorizado",
                "soporte",
                "atencion",
                "socio",
                "administrador",
                "cliente"
            ],
            default:"cliente"
        },
        token: {
            type: String,
        },
        fcmTokens: {
            type: [fcmTokenSchema], // ¡Añade esto!
            default: [],
        },
        confirmado: {
            type: Boolean,
            default: false,
        },
        habilitado: {
            type: Boolean,
            default: false,
        },
        horaActivacion: {
            type: Date,
            default: null
        },
        estadoUsuario: { // Añadir el nuevo campo
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

usuarioSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

usuarioSchema.methods.comprobarPassword = async function (passwordFormulario) {
    return await bcrypt.compare(passwordFormulario, this.password);
};

const Usuario = mongoose.model("Usuario", usuarioSchema);
export default Usuario;
