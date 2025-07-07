// Monitoreo de tráfico por ruta
const trafficStats = {};

app.use((req, res, next) => {
    const ruta = req.originalUrl.split('?')[0];

    const start = process.hrtime.bigint(); // Para medir tiempo si quieres
    const chunks = [];

    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk, ...args) {
        if (chunk) chunks.push(Buffer.from(chunk));
        return originalWrite.apply(res, [chunk, ...args]);
    };

    res.end = function (chunk, ...args) {
        if (chunk) chunks.push(Buffer.from(chunk));
        const body = Buffer.concat(chunks);
        const sizeKB = body.length / 1024;

        if (!trafficStats[ruta]) {
            trafficStats[ruta] = { count: 0, kbSent: 0 };
        }

        trafficStats[ruta].count += 1;
        trafficStats[ruta].kbSent += sizeKB;

        const duration = Number(process.hrtime.bigint() - start) / 1e6; // ms

        console.log(`📊 Ruta: ${ruta} | Solicitudes: ${trafficStats[ruta].count} | Tráfico: ${sizeKB.toFixed(2)} KB | Tiempo: ${duration.toFixed(2)} ms`);

        return originalEnd.apply(res, [chunk, ...args]);
    };

    next();
});
