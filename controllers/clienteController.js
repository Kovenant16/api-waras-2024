import Cliente from "../models/Cliente.js";

const agregarCliente = async (req, res) => {
    const { telefono } = req.body;

    const existeCliente = await Cliente.findOne({ telefono });
    if (existeCliente) {
        new Error("Cliente existente");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const cliente = new Cliente(req.body);
        await cliente.save()
    } catch (error) {
        console.log(error);
    }
};

const buscarClientesPorTelefono = async (req, res) => {
    const { telefono } = req.body;

    const clientes = await Cliente.find({telefono})

    res.json(clientes)

    
};



export { agregarCliente,buscarClientesPorTelefono };
