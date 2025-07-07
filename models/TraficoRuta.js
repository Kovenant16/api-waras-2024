import mongoose from 'mongoose';

const traficoRutaSchema = new mongoose.Schema({
    ruta: { type: String, required: true },
    metodo: { type: String, required: true },
    tamanoKB: { type: Number, required: true },
    duracionMs: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

const TraficoRuta = mongoose.model('TraficoRuta', traficoRutaSchema);

export default TraficoRuta;
