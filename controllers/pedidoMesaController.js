import PedidoMesa from "../models/pedidoMesa.js";

const nuevoPedidoMesa = async (req, res) => {
    const pedidoMesa = new PedidoMesa(req.body)

    pedidoMesa.mesero = req.usuario._id;

    try {
        const pedidoMesaAlmacenado =await pedidoMesa.save();
        res.json(pedidoMesaAlmacenado)
    } catch (error) {
        console.log(error);
    }
}

export {
    nuevoPedidoMesa
}