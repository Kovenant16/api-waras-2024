// src/utils/sequenceGenerator.js
import Counter from '../models/Counter.js'; // Ajusta la ruta si es necesario

/**
 * Obtiene y incrementa el siguiente número de secuencia para un contador dado.
 * @param {string} counterName - El nombre del contador (ej. 'pedidoAppId').
 * @returns {Promise<number>} El siguiente número secuencial.
 */
export async function getNextSequence(counterName) {
    // Reemplazamos rawResult: true con includeResultMetadata: false
    // y ajustamos cómo obtenemos el valor del contador.
    const counterDoc = await Counter.findOneAndUpdate(
        { _id: counterName },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, includeResultMetadata: false } // <-- ¡Cambio aquí!
    );

    // counterDoc ahora es directamente el documento de Mongoose actualizado
    return counterDoc.seq;
}

// Para inicializar el contador si es la primera vez que se usa la aplicación
export async function initializeCounter(counterName) {
    const existingCounter = await Counter.findById(counterName);
    if (!existingCounter) {
        const newCounter = new Counter({ _id: counterName, seq: 0 }); // Inicia en 0 para que el primer pedido sea 1
        await newCounter.save();
        console.log(`Contador '${counterName}' inicializado.`);
    }
}