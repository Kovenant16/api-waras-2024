import Producto from "../models/Productos.js";
import Local from "../models/Local.js";



const obtenerTiendas = async (req, res) => {
    const tiendas = await Local.find({ tienda: true }).select("nombre direccion gps urlLogo diasAbiertos telefonoUno ruta horario ubicacion tiempoPreparacion horaInicioFin adicionalPorTaper tags");
    res.json(tiendas);
    console.log('tiendas obtenidas');
}

const obtenerTiendasTotales = async (req, res) => {
    const tiendas = await Local.find().select("nombre direccion gps urlLogo diasAbiertos telefonoUno ruta horario ubicacion tiempoPreparacion horaInicioFin adicionalPorTaper tags").sort({nombre:1});
    res.json(tiendas);
}

const obtenerTienda = async (req, res) => {
    const { ruta } = req.params; // Obtiene el valor de "ruta" desde los parámetros

    try {
        // Utiliza el valor de "ruta" para buscar la tienda por ese campo
        const tienda = await Local.findOne({ ruta });

        if (!tienda) {
            // Si no se encuentra la tienda, puedes enviar una respuesta de error
            return res.status(404).json({ mensaje: 'Tienda no encontrada' });
        }

        // Si se encuentra la tienda, envía la respuesta con la tienda encontrada
        res.json(tienda);
    } catch (error) {
        // Manejo de errores en caso de una excepción
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};



const obtenerProductosPorTienda = async (req, res) => {
    const { idLocal } = req.body;
    console.log("ID de la tienda:", idLocal);

    try {
        // Verifica si idLocal es un valor válido antes de realizar la consulta
        if (!idLocal) {
            return res.status(400).json({ error: "ID de tienda no proporcionado" });
        }

        // Utiliza async/await para esperar la consulta a la base de datos
        const productos = await Producto.find({ local: idLocal })
            .select('categoria cover descripcion nombre precio taper disponibilidad')
            .sort({ categoria: 'asc' }); // Ordena los productos por categoría en orden ascendente

        if (!productos || productos.length === 0) {
            return res.status(404).json({ error: "No se encontraron productos para esta tienda" });
        }

        // Envía la respuesta con los productos encontrados
        res.json(productos);

        console.log("productos obtenidos", productos.length);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};


const obtenerProductoPorId = async (req, res) => {
    const { productoId } = req.params; // Cambiado de req.body a req.params para obtener el ID desde los parámetros de la URL
    console.log("ID del producto:", productoId);

    try {
        if (!productoId) {
            return res.status(400).json({ error: "ID de producto no proporcionado" });
        }

        // Utiliza async/await para esperar la consulta a la base de datos
        const producto = await Producto.findById(productoId).populate("local");

        if (!producto) {
            return res.status(404).json({ error: "No se encontró un producto con ese ID" });
        }

        // Envía la respuesta con el producto encontrado
        res.json(producto);

        
    } catch (error) {
        console.error("Error al obtener producto por ID:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

const obtenerProductosPorCategoria = async (req, res) => {
    const { categoria } = req.body;
    console.log("Categoría:", categoria);

    try {
        if (!categoria) {
            return res.status(400).json({ error: "Categoría no proporcionada" });
        }

        // Utiliza async/await para esperar la consulta a la base de datos
        const productos = await Producto.find({ categoria }).populate("local", "nombre urlLogo ruta");

        if (!productos || productos.length === 0) {
            return res.status(404).json({ error: "No se encontraron productos en esta categoría" });
        }

        // Filtrar y limitar a 5 productos de cada local
        const productosFiltrados = {};
        productos.forEach((producto) => {
            const localNombre = producto.local.nombre;
            if (!productosFiltrados[localNombre]) {
                productosFiltrados[localNombre] = [];
            }
            if (productosFiltrados[localNombre].length < 5) {
                productosFiltrados[localNombre].push(producto);
            }
        });

        // Convertir el objeto de productos filtrados en un array
        const resultado = Object.values(productosFiltrados).flat();

        // Envía la respuesta con los productos encontrados
        res.json(resultado);

        console.log("Productos encontrados en la categoría:", resultado.length);
    } catch (error) {
        console.error("Error al obtener productos por categoría:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

const agregarProducto = async (req, res) => {
    try {
        const { localId, nombre, categoria, descripcion, precio, cover, taper, opcionesUnicas, opcionesMultiples, disponibilidad, tags } = req.body;

        const nuevoProducto = new Producto({
            local: localId,
            nombre,
            categoria,
            descripcion,
            precio,
            cover,
            taper,
            opcionesUnicas,
            opcionesMultiples,
            disponibilidad,
            tags
        });

        const productoAlmacenado = await nuevoProducto.save();
        res.status(201).json(productoAlmacenado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
}




const eliminarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        // Primero, verifica si el producto existe en la base de datos
        const producto = await Producto.findById(id);

        if (!producto) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        // Si el producto existe, elimínalo
        await producto.deleteOne();

        res.status(200).json({ mensaje: 'Producto eliminado con éxito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
}

const editarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const producto = await Producto.findById(id);

        if (!producto) {
            return res.status(404).json({ msg: "Producto no encontrado" });
        }

        // Aquí puedes realizar una validación para determinar si el usuario tiene permiso para editar el producto.
        // Por ejemplo, si solo los administradores pueden editar productos:
        // if (req.usuario.rol !== "Administrador") {
        //     return res.status(403).json({ msg: "No tienes permiso para editar productos" });
        // }

        // Ahora actualizamos los campos del producto con los valores del cuerpo de la solicitud (req.body).
        producto.nombre = req.body.nombre || producto.nombre;
        producto.categoria = req.body.categoria || producto.categoria;
        producto.descripcion = req.body.descripcion || producto.descripcion;
        producto.precio = req.body.precio || producto.precio;
        producto.cover = req.body.cover || producto.cover;
        producto.taper = req.body.taper || producto.taper;
        producto.local = req.body.local || producto.local;
        producto.opcionesUnicas = req.body.opcionesUnicas;
        producto.opcionesMultiples = req.body.opcionesMultiples;

        const productoActualizado = await producto.save();
        res.json(productoActualizado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al editar el producto" });
    }
};

const toggleDisponibilidadProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const producto = await Producto.findById(id);

        if (!producto) {
            return res.status(404).json({ msg: "Producto no encontrado" });
        }

        // Alternamos el valor de producto.disponible
        producto.disponibilidad = !producto.disponibilidad;

        const productoActualizado = await producto.save();
        res.json(productoActualizado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al alternar la disponibilidad del producto" });
    }
};



export {
    obtenerTiendas,
    obtenerTienda,
    agregarProducto,
    obtenerProductosPorTienda,
    obtenerProductoPorId,
    eliminarProducto,
    editarProducto,
    obtenerProductosPorCategoria,
    obtenerTiendasTotales,
    toggleDisponibilidadProducto,
    
};