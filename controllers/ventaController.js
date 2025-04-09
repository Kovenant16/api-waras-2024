//import Venta from "../models/venta.js";
import Venta from "../models/Venta.js";

// 📌 Crear nueva venta
const nuevaVenta = async (req, res) => {
    try {
        const venta = new Venta(req.body);
        venta.mesero = req.usuario._id; // Asigna el mesero autenticado

        const ventaGuardada = await venta.save();
        res.json(ventaGuardada);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al registrar la venta" });
    }
};

// 📌 Obtener todas las ventas (con filtro opcional por estado o fecha)
const obtenerVentas = async (req, res) => {
    try {
        const { estado, fecha } = req.query; // Opcional: Filtrar por estado o fecha

        let query = {};
        if (estado) query.estado = estado;
        if (fecha) {
            const start = new Date(`${fecha}T00:00:00.000Z`);
            const end = new Date(`${fecha}T23:59:59.999Z`);
            query.createdAt = { $gte: start, $lte: end };
        }

        const ventas = await Venta.find(query).populate("mesero", "nombre").populate("pedido.producto", "nombre precio");
        res.json(ventas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al obtener las ventas" });
    }
};

// 📌 Obtener una venta por ID
const obtenerVenta = async (req, res) => {
    try {
        const venta = await Venta.findById(req.params.id)
            .populate("mesero", "nombre")
            .populate("pedido.producto", "nombre precio");

        if (!venta) {
            return res.status(404).json({ msg: "Venta no encontrada" });
        }

        res.json(venta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al obtener la venta" });
    }
};

// 📌 Editar una venta
const editarVenta = async (req, res) => {
    try {
        const venta = await Venta.findById(req.params.id);

        if (!venta) {
            return res.status(404).json({ msg: "Venta no encontrada" });
        }

        Object.assign(venta, req.body); // Actualizar solo los campos enviados
        const ventaActualizada = await venta.save();

        res.json(ventaActualizada);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al actualizar la venta" });
    }
};

// 📌 Eliminar una venta
const eliminarVenta = async (req, res) => {
    try {
        const venta = await Venta.findById(req.params.id);

        if (!venta) {
            return res.status(404).json({ msg: "Venta no encontrada" });
        }

        await venta.deleteOne();
        res.json({ msg: "Venta eliminada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al eliminar la venta" });
    }
};

export {
    nuevaVenta,
    obtenerVentas,
    obtenerVenta,
    editarVenta,
    eliminarVenta
};
