import mongoose from 'mongoose';

const verificacionSchema = new mongoose.Schema({
    telefono: {
        type: String,
        required: true,
        unique: true
    },
    codigo: {
        type: String,
        required: true
    },
    expireAt: { // Agrega este campo al esquema
        type: Date,
        required: true,
        index: { expires: '5m' } // Establece el tiempo de expiración (5 minutos en este ejemplo)
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

const Verificacion = mongoose.model('Verificacion', verificacionSchema);

export default Verificacion;
