// src/models/Counter.js
import mongoose from 'mongoose';

const CounterSchema = mongoose.Schema({
    _id: { // El nombre del contador (ej. 'pedidoAppId')
        type: String,
        required: true
    },
    seq: { // El valor actual de la secuencia
        type: Number,
        default: 0
    }
});

const Counter = mongoose.model('Counter', CounterSchema);
export default Counter;