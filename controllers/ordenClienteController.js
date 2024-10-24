import OrdenCliente from "../models/OrdenCliente.js";



const nuevaOrdenCliente = async (req,res) => {
    try {
        const ordenCliente = new OrdenCliente(req.body);
        const ordenAlmacenada = await ordenCliente.save();

        res.json(ordenAlmacenada);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Hubo un error al crear la orden del cliente." });
    }
};

const obtenerOrdenesClientes = async (req, res) => {
    try {
        const ordenes = await OrdenCliente.find()
            .populate({
                path: 'pedido.producto',
                model: 'Producto',
                select: "categoria  nombre precio taper local",
                populate: {
                    path: 'local', // Hace populate del campo local dentro de Producto
                    model: 'Local', // Nombre del modelo del campo local
                    select: 'nombre adicionalPorTaper' // Selecciona los campos que necesitas del modelo Local
                }
            })
            .sort({ createdAt: -1 });

        res.status(200).json(ordenes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener las órdenes de cliente' });
    }
};



export {
    nuevaOrdenCliente,obtenerOrdenesClientes
};
