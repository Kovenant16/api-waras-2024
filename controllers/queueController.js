import { agregarPedidoACola } from "../config/queue";

export const añadirPedido = (req, res) => {
    const { pedido } = req.body;
    agregarPedidoACola(pedido);
    res.json({ success: true, message: "Pedido añadido a la cola" });
};