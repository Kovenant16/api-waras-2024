// src/utils/sequenceGenerator.js
import Counter from '../models/Counter.js'; // Ajusta la ruta si es necesario

// Función auxiliar para incrementar el prefijo alfabético (A -> B, Z -> AA, etc.)
function incrementPrefix(prefix) {
    if (!prefix) return 'A'; // Si no hay prefijo, empieza con A

    let result = '';
    let carry = true; // Indica si necesitamos avanzar al siguiente carácter

    // Iterar el prefijo de derecha a izquierda
    for (let i = prefix.length - 1; i >= 0 && carry; i--) {
        let charCode = prefix.charCodeAt(i);
        if (charCode === 90) { // Si es 'Z' (ASCII 90)
            result = 'A' + result; // Se convierte en 'A' y arrastra un carry
        } else {
            result = String.fromCharCode(charCode + 1) + result; // Incrementa el carácter
            carry = false; // No hay carry, hemos incrementado
        }
    }

    // Si todavía hay un carry después de iterar todo el prefijo (ej. de Z a AA)
    if (carry) {
        result = 'A' + result;
    }

    return result;
}

/**
 * Obtiene y incrementa el siguiente número de secuencia alfanumérico para un contador dado.
 * Formato: PREFIJO-NUMERO (ej. A-001, B-050, AA-123)
 * @param {string} counterName - El nombre del contador (ej. 'pedidoAppId').
 * @param {number} maxNumberPerPrefix - El número máximo antes de cambiar el prefijo (ej. 999).
 * @returns {Promise<string>} El siguiente número secuencial alfanumérico.
 */
export async function getNextSequenceAlphanumeric(counterName, maxNumberPerPrefix = 999) {
    const counterDoc = await Counter.findOneAndUpdate(
        { _id: counterName },
        {
            $inc: { currentNumber: 1 } // Incrementamos el número
        },
        { new: true, upsert: true, includeResultMetadata: false }
    );

    let { currentNumber, currentPrefix } = counterDoc;

    // Si el número excede el máximo, reseteamos el número e incrementamos el prefijo
    if (currentNumber > maxNumberPerPrefix) {
        currentPrefix = incrementPrefix(currentPrefix); // Obtenemos el siguiente prefijo
        currentNumber = 1; // Reseteamos el número a 1

        // Actualizamos el contador en la BD con el nuevo prefijo y número reseteado
        await Counter.updateOne(
            { _id: counterName },
            { $set: { currentNumber: currentNumber, currentPrefix: currentPrefix } }
        );
    }

    // Formatear el número con ceros a la izquierda (ej. 1 -> 001, 12 -> 012)
    const formattedNumber = String(currentNumber).padStart(String(maxNumberPerPrefix).length, '0');

    return `${currentPrefix}-${formattedNumber}`;
}

/**
 * Inicializa un contador alfanumérico si no existe.
 * @param {string} counterName - El nombre del contador.
 * @param {string} initialPrefix - El prefijo inicial (ej. 'A').
 * @param {number} initialNumber - El número inicial (ej. 0 para que el primer pedido sea 1).
 */
export async function initializeAlphanumericCounter(counterName, initialPrefix = 'A', initialNumber = 0) {
    const existingCounter = await Counter.findById(counterName);
    if (!existingCounter) {
        const newCounter = new Counter({
            _id: counterName,
            currentNumber: initialNumber,
            currentPrefix: initialPrefix
        });
        await newCounter.save();
        console.log(`Contador alfanumérico '${counterName}' inicializado con prefijo '${initialPrefix}' y número '${initialNumber}'.`);
    }
}