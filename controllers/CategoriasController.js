import Categoria from "../models/Categoria.js";

const agregarCategoria = async (req, res) => {
    const { nombre, descripcion, cover } = req.body;


    const nuevaCategoria = new Categoria({
        nombre, descripcion, cover
    });

    try {
        const categoriaAlmacenada = await nuevaCategoria.save();
        res.status(201).json(categoriaAlmacenada)
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al crear categoria" })
    }
}

const obtenerCategorias = async (req, res) => {
    const categorias = await Categoria.find().sort({nombre: 1})

    res.json(categorias)
}

export {
    agregarCategoria,obtenerCategorias
}