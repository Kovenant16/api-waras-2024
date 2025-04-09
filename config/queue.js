const colaPedidos = [];
const pedidosEnProceso = new Map();

const agregarPedidoACola = (pedido) => {
    colaPedidos.push(pedido);
    procesarCola();
};

const procesarCola = async () => {
    if (colaPedidos.length === 0) return;

    while (colaPedidos.length > 0) {
        const pedido = colaPedidos.shift();
        console.log(`Procesando pedido ${pedido._id}`);

        const motorizadoDisponible = await encontrarMotorizadoDisponible();
        if (!motorizadoDisponible) {
            console.log("No hay motorizados disponibles. Reintentando en 1 minuto...");
            setTimeout(() => agregarPedidoACola(pedido), 60000);
            continue;
        }

        pedido.driver = motorizadoDisponible._id;
        pedido.estadoPedido = "pendiente";
        pedidosEnProceso.set(pedido._id, { pedido, timestamp: Date.now() });

        console.log(`Pedido ${pedido._id} asignado a ${motorizadoDisponible.nombre}`);

        setTimeout(() => verificarRespuestaMotorizado(pedido), 120000);
    }
};

const verificarRespuestaMotorizado = (pedido) => {
    if (!pedidosEnProceso.has(pedido._id)) return;
    console.log(`Verificando respuesta para el pedido ${pedido._id}`);
    
    const aceptado = Math.random() < 0.7; 
    if (!aceptado) {
        console.log(`Motorizado no aceptó el pedido ${pedido._id}, reasignando...`);
        agregarPedidoACola(pedido);
    } else {
        console.log(`Pedido aceptado`);
        pedidosEnProceso.delete(pedido._id);
    }
};

export { agregarPedidoACola, procesarCola };
