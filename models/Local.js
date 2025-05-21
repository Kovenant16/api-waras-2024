import mongoose from "mongoose";

const localSchema = mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            trim: true,
        },
        direccion: {
            type: String,
        },
        gps: {
            type: String,
        },
        telefonoUno: {
            type: String,
        },
        telefonoDos: {
            type: String,
        },
        telefonoTres: {
            type: String,
        },
        urlLogo: {
            type: String,
        },
        colaboradores: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Usuario",
            },
        ],
        habilitado: {
            type: Boolean,
            default: true,
        },
        tienda:{
            type:Boolean,
            default:false
        },
        ruta: {
            type:String
        },
        facebook:{
            type:String
        },
        urlBanner: {
            type:String
        },
        horario: {
            type:String
        },
        ubicacion:{
            type:String
        },
        tiempoPreparacion:{
            type:String
        },
        diasAbiertos:[],
        horaInicioFin:[],
        adicionalPorTaper:{
            type:String
        },
        versionCarta:{
            type:Number,
            default:1
        },
        idTelegram:{
            type:String
        },
        tipo: {
            type: String,
            required: true, // Esto significa que cada tienda debe tener un tipo
            enum: ['comida', 'mercado', 'farmacia', 'licores', 'regalos', 'otros'], // Define tus categorías aquí
            default: 'comida', // Un valor por defecto si no se especifica
        },
    },
    {
        timestamps: true,
    }
);

const Local = mongoose.model("Local", localSchema);
export default Local;
