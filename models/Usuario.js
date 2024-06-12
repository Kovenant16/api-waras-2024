import mongoose from "mongoose";
import bcrypt from "bcrypt";

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
        confirmado: {
            type: Boolean,
            default: false,
        },
        habilitado: {
            type: Boolean,
            default: false,
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
