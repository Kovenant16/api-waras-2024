// models/Counter.js
import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    currentNumber: { // Renombrado de 'seq' a 'currentNumber' para mayor claridad
        type: Number,
        default: 0
    },
    currentPrefix: { // Nuevo campo para el prefijo alfabético
        type: String,
        default: 'A' // Empezamos con 'A'
    }
});

const Counter = mongoose.model('Counter', CounterSchema);

export default Counter;