import mongoose from 'mongoose';

const verificacionSchema = new mongoose.Schema({
    telefono: { type: String, required: true, unique: true },
    codigo: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '5m' }, // El código expirará en 5 minutos
});

const Verificacion = mongoose.model('Verificacion', verificacionSchema);

export default Verificacion;