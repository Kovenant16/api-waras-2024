import Pedido from "../models/Pedido.js";
import Usuario from "../models/Usuario.js";
import Local from "../models/Local.js";
import Cliente from "../models/Cliente.js";
import { Server } from 'socket.io';
import { sendMessage, sendMessageWithId, deleteMessageWithId } from "../bot/bot.js";
import moment from 'moment-timezone';

const io = new Server(/* Parámetros del servidor, como la instancia de tu servidor HTTP */);

const formatHoraEntrega = (horaEntrega) => {
    const date = new Date(horaEntrega);
    return date.toLocaleTimeString('es-PE', { hour12: false });
};

// Manejo de eventos de WebSocket
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

//testeo pendiente
const obtenerUltimosVeintePedidos = async (req, res) => {
    //Todo: Revisar si bota los 20 pedidos mas recientes
    const pedidos = await Pedido.find()
        .populate(
            "driver",
            "-confirmado -createdAt -habilitado -password -telefono -token -updatedAt -__v"
        )
        .populate(
            "generadoPor",
            "-confirmado -createdAt -habilitado -password -telefono -token -updatedAt -__v"
        )
        .populate(
            "local",
            "-colaboradores -createdAt -direccion -gps -habilitado -telefonoUno -updatedAt -__v"
        )
        .limit(20);
    res.json(pedidos);
};



//completado
const obtenerPedidosNoEntregados = async (req, res) => {
    const pedidos = await Pedido.find({
        estadoPedido: ["pendiente", "recogido", "sin asignar", "en local"],
    })
        .populate({
            path: "driver",
            select: "nombre"
        })
        .populate(
            {
                path: "generadoPor",
                select: "nombre"
            }
        )
        .populate(
            { path: "local", select: "nombre gps" }
        )
        .select(
            "-createdAt -gpsCreacion -horaCreacion -updatedAt -__v  -tipoPedido"
        )
        .sort({
            hora: 1  // Orden ascendente por el campo 'hora'
        });
    res.json(pedidos);
    console.log("obtenido todos los pedidos no entregados");
};

const obtenerPedidosNoEntregadosPorLocal = async (req, res) => {
    const { localId } = req.params;  // Asumiendo que el localId se pasa como un parámetro en la URL

    try {
        const pedidos = await Pedido.find({
            estadoPedido: ["pendiente", "recogido", "sin asignar", "en local"],
            local: localId
        })
            .populate({
                path: "driver",
                select: "nombre"
            })
            .populate({
                path: "generadoPor",
                select: "nombre"
            })
            .populate({
                path: "local",
                select: "nombre gps"
            })
            .select(
                "-createdAt -gpsCreacion -horaCreacion -updatedAt -__v  -tipoPedido"
            )
            .sort({
                hora: 1  // Orden ascendente por el campo 'hora'
            });

        res.json(pedidos);

        console.log("obtenido todos los pedidos no entregados de " + localId);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};


//completado
const obtenerPedidosMotorizadoLogueado = async (req, res) => {
    const pedidos = await Pedido.find({
        estadoPedido: ["pendiente", "recogido", "sin asignar", "en local"],
    })
        .where("driver")
        .equals(req.usuario);

    res.json(pedidos);
};

//completado
const nuevoPedido = async (req, res) => {
    const pedido = new Pedido(req.body);
    pedido.generadoPor = req.usuario._id;

    try {
        const proyectoAlmacenado = await pedido.save();

        // Obtén el local asociado al pedido
        const local = await Local.findById(proyectoAlmacenado.local);

        if (!local) {
            return res.status(404).json({ message: 'Local no encontrado' });
        }

        // Crea el mensaje incluyendo los detalles del local
        // const message = `Nuevo pedido creado:\nLocal: ${local.nombre}, Dirección: ${proyectoAlmacenado.direccion}`;
        // sendMessageWithConfirmButton(message, proyectoAlmacenado._id);

        res.json(proyectoAlmacenado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error al crear el pedido' });
    }
};



const nuevoPedidoSocio = async (req, res) => {
    const pedido = new Pedido(req.body);
    pedido.generadoPor = req.usuario._id;

    try {
        const proyectoAlmacenado = await pedido.save();

        // Obtén el local asociado al pedido
        const local = await Local.findById(proyectoAlmacenado.local);

        if (!local) {
            return res.status(404).json({ message: 'Local no encontrado' });
        }

        // Capitaliza la primera letra del nombre del local y de la dirección
        const nombreLocal = local.nombre.charAt(0).toUpperCase() + local.nombre.slice(1).toLowerCase();
        const direccion = proyectoAlmacenado.direccion.charAt(0).toUpperCase() + proyectoAlmacenado.direccion.slice(1).toLowerCase();
        const chatIdCentral = '-4112441362'
        // Crea el mensaje incluyendo los detalles del local y la hora
        const message = `✅Nuevo pedido creado\n\nPor: ${nombreLocal}\nDirección: ${direccion}\nHora: ${proyectoAlmacenado.hora}`;
        sendMessage(message, chatIdCentral);


        res.json(proyectoAlmacenado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error al crear el pedido' });
    }
};


// const nuevoPedido = async (req, res, io) => {
//     const pedido = new Pedido(req.body);

//     pedido.generadoPor = req.usuario._id;

//     try {
//       const pedidoAlmacenado = await pedido.save();
//       res.json(pedidoAlmacenado);

//       // **Emisión del evento 'server:newpedido'**
//       io.emit('server:newpedido', pedidoAlmacenado);
//     } catch (error) {
//       console.log(error);
//     }
// };

//completado, acepta mejoras
const obtenerPedido = async (req, res) => {
    const { id } = req.params;

    const pedido = await Pedido.findById(id)
        .populate({
            path: "driver",
            populate: {
                path: "organizacion",
                select: "-direccion -gps -telefonoUno -colaboradores -habilitado -createdAt -updatedAt -__v",
            },
            select: "-password -confirmado -habilitado -token -createdAt -updatedAt -__v",
        })
        .populate({
            path: "generadoPor",
            select: "-password -confirmado -rol -habilitado -token -createdAt -updatedAt -__v",
            populate: {
                path: "organizacion",
                select: "-direccion -gps -telefonoUno -colaboradores -habilitado -createdAt -updatedAt -__v",
            },
        })
        .populate({
            path: "local",
            select: "-createdAt -habilitado -updatedAt",
        })
        .populate({
            path: "cliente",
            select: "",
        });

    if (!pedido) {
        return res.status(404).json({ msg: "Pedido no encontrado" });
    }



    return res.json(pedido);




};

const obtenerPedidoSocio = async (req, res) => {
    const { id } = req.params;

    const pedido = await Pedido.findById(id)
        .populate({
            path: "driver",
            populate: {
                path: "organizacion",
                select: "-direccion -gps -telefonoUno -colaboradores -habilitado -createdAt -updatedAt -__v",
            },
            select: "-password -confirmado -habilitado -token -createdAt -updatedAt -__v",
        })
        .populate({
            path: "generadoPor",
            select: "-password -confirmado -rol -habilitado -token -createdAt -updatedAt -__v",
            populate: {
                path: "organizacion",
                select: "-direccion -gps -telefonoUno -colaboradores -habilitado -createdAt -updatedAt -__v",
            },
        })
        .populate({
            path: "local",
            select: "-createdAt -habilitado -updatedAt",
        })
        .populate({
            path: "cliente",
            select: "",
        }).limit(30);

    if (!pedido) {
        return res.status(404).json({ msg: "Pedido no encontrado" });
    }

    //validacion de si es administrador o soporte
    if (
        req.usuario.rol.toString() == "socio"
    ) {
        return res.json(pedido);
    }

    //validacion de si el motorizado esta consultando su pedido
    if (req.usuario._id.toString() === pedido.driver._id.toString()) {
        return res.json(pedido);
    }
};

//completado
const editarPedido = async (req, res) => {
    const { id } = req.params;

    const pedido = await Pedido.findById(id);

    if (!pedido) {
        const error = new Error("Pedido no encontrado");
        return res.status(404).json({ msg: error.message });
    }


    pedido.fecha = req.body.fecha || pedido.fecha;
    pedido.local = req.body.local || pedido.local;
    pedido.hora = req.body.hora || pedido.hora;
    pedido.direccion = req.body.direccion || pedido.direccion;
    pedido.gps = req.body.gps || pedido.gps;
    pedido.detallePedido = req.body.detallePedido || pedido.detallePedido;
    pedido.tipoPedido = req.body.tipoPedido || pedido.tipoPedido;
    pedido.telefono = req.body.telefono || pedido.telefono;
    pedido.cobrar = req.body.cobrar || pedido.cobrar;
    pedido.delivery = req.body.delivery || pedido.delivery;
    pedido.comVenta = req.body.comVenta || pedido.comVenta;
    pedido.medioDePago = req.body.medioDePago || pedido.medioDePago;
    pedido.driver = req.body.driver || pedido.driver;
    pedido.estadoPedido = req.body.estadoPedido || pedido.estadoPedido;

    try {
        const pedidoAlmacenado = await pedido.save();
        res.json(pedidoAlmacenado);
    } catch (error) {
        console.log(error);
    }
};

//completado
const eliminarPedido = async (req, res) => {
    const { id } = req.params;

    const pedido = await Pedido.findById(id);

    if (!pedido) {
        const error = new Error("Pedido no encontrado");
        return res.status(404).json({ msg: error.message });
    }

    //validacion de si es administrador o soporte
    if (req.usuario.rol === "Administrador" || req.usuario.rol === "Soporte") {
        const error = new Error("No permitido");
        return res.status(404).json({ msg: error.message });
    }

    try {
        await pedido.deleteOne();
        res.json({ msg: "Pedido eliminado" });
    } catch (error) {
        console.log(error);
    }
};

const eliminarPedidoSocio = async (req, res) => {
    const { id } = req.params;

    try {
        const pedido = await Pedido.findById(id);
        console.log(pedido);

        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        // Validación de si es administrador o soporte
        if (req.usuario.rol === "Administrador" || req.usuario.rol === "Soporte") {
            const error = new Error("No permitido");
            return res.status(403).json({ msg: error.message });
        }

        // Verificación del estado del pedido
        const estadosNoEliminables = ["en local", "recogido", "entregado", "pendiente"];
        if (estadosNoEliminables.includes(pedido.estadoPedido)) {
            const error = new Error(`No se puede eliminar el pedido porque ya está en estado: ${pedido.estadoPedido}`);
            return res.status(400).json({ msg: error.message });
        }

        await pedido.deleteOne();
        res.json({ msg: "Pedido eliminado" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al eliminar el pedido" });
    }
};


const asignarMotorizado = async (req, res) => {
    const { idPedido, idDriver } = req.body;

    console.log("driver: " + idDriver);
    console.log("idPedido: " + idPedido);

    try {
        const pedido = await Pedido.findById(idPedido);
        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        const local = await Local.findById(pedido.local).select("idTelegram");
        const idTelegram = local?.idTelegram; // Usar optional chaining para evitar errores si local es null

        console.log('ID de Telegram:', idTelegram);

        if (pedido.idMensajeTelegram && pedido.idTelegram) {
            await deleteMessageWithId(pedido.idTelegram, pedido.idMensajeTelegram);
        }

        if (!pedido.driver) {
            pedido.driver = idDriver;
            pedido.estadoPedido = "pendiente";
            pedido.idTelegram = idTelegram;
            const pedidoGuardado = await pedido.save();

            const usuario = await Usuario.findById(idDriver);
            if (!usuario) {
                const error = new Error("Usuario no encontrado");
                return res.status(404).json({ msg: error.message });
            }
            usuario.estadoUsuario = "Con pedido";
            await usuario.save();

            // Enviar mensaje y guardar el ID del mensaje en el pedido
            if (idTelegram) {
                const mensaje = await sendMessageWithId(idTelegram, `🛵 Pedido asignado:\n\nHora: ${pedido.hora}\nDireccion:${pedido.direccion}\n\nha sido aceptado por motorizado`);
                pedido.idMensajeTelegram = mensaje.message_id; // Guardar el ID del mensaje
                await pedido.save();
            } else {
                console.error('ID de Telegram no disponible');
            }

            res.json(pedidoGuardado);
        } else {
            const error = new Error("Pedido ya ha sido tomado");
            return res.status(400).json({ msg: error.message });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
 };

const obtenerPedidosPorFecha = async (req, res) => {
    const { fecha } = req.body;
    const pedidos = await Pedido.find({ fecha })
        .populate({
            path: "driver",
            select: "nombre" // Solo seleccionamos el campo 'nombre' del driver
        })
        .populate({
            path: "local",
            select: "nombre"
        })
        .populate({
            path: "generadoPor",
            select: "nombre"
        })
        .select("-detallePedido -gps -gpsCreacion -horaCreacion -medioDePago -tipoPedido");

    res.json(pedidos);
};

const obtenerPedidosPorTelefonoConGps = async (req, res) => {
    try {
        let { telefono } = req.body;
        telefono = telefono.replace(/\s+/g, '');

        // Realiza una consulta para obtener todos los valores de GPS sin duplicados
        const gpsUnicos = await Pedido.find({ telefono, gps: { $ne: "" } }).distinct("gps");

        // Consulta los pedidos usando los valores únicos de GPS
        const pedidos = await Pedido.find({ telefono, gps: { $in: gpsUnicos } })
            .populate({ path: "local", select: "nombre" })
            .select("delivery direccion fecha local gps")
            .sort({ fecha: -1 }); // Ordena los pedidos por fecha en orden descendente

        // Utiliza un objeto auxiliar para rastrear los pedidos más recientes para cada valor de "gps"
        const pedidosFiltrados = {};
        pedidos.forEach((pedido) => {
            const gps = pedido.gps;
            if (!pedidosFiltrados[gps] || pedido.fecha > pedidosFiltrados[gps].fecha) {
                pedidosFiltrados[gps] = pedido;
            }
        });

        // Convierte el objeto de pedidos filtrados en un arreglo
        const resultado = Object.values(pedidosFiltrados);

        res.json(resultado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los pedidos." });
    }
};

const obtenerPedidosPorTelefono = async (req, res) => {
    try {
        let { telefono } = req.body;
        telefono = telefono.replace(/\s+/g, '');

        // Realiza una consulta para obtener todos los valores de GPS sin duplicados


        // Consulta los pedidos usando los valores únicos de GPS
        const pedidos = await Pedido.find({ telefono })
            .populate({ path: "local", select: "nombre" })
            .select("delivery direccion fecha local gps telefono")
            .sort({ fecha: -1 })
            .limit(20); // Ordena los pedidos por fecha en orden descendente
        res.json(pedidos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los pedidos." });
    }
};

const obtenerPedidosPorTelefonoYLocal = async (req, res) => {
    try {
        let { telefono, localId } = req.body;
        telefono = telefono.replace(/\s+/g, '');

        let filtro = { telefono };
        if (localId) {
            filtro.local = localId;
        }

        const pedidos = await Pedido.find(filtro)

            .select("delivery direccion fecha  gps telefono")
            .sort({ fecha: -1 })
            .limit(15);

        res.json(pedidos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los pedidos." });
    }
};

const obtenerPedidosPorTelefonoYLocalYGpsVacio = async (req, res) => {
    try {
        let { telefono, localId } = req.body;
        telefono = telefono.replace(/\s+/g, '');

        let filtro = {
            telefono,
            $or: [
                { gps: { $exists: false } },
                { gps: "" }
            ]
        };

        if (localId) {
            filtro.local = localId;
        }

        const pedidos = await Pedido.find(filtro)
            .select("delivery direccion fecha gps telefono")
            .sort({ fecha: -1 })
            .limit(6);

        res.json(pedidos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los pedidos." });
    }
};

const obtenerPedidosSinGPS = async (req, res) => {
    try {
        let { telefono } = req.body;
        telefono = telefono.replace(/\s+/g, '');

        // Realiza una consulta para obtener todos los pedidos que no tienen "gps" o tienen "gps" como una cadena vacía
        const pedidosSinGPS = await Pedido.find({
            telefono,
            $or: [
                { gps: { $exists: false } },
                { gps: "" }
            ]
        })
            .populate({ path: "local", select: "nombre" })
            .sort({ fecha: -1 })
            .select("delivery direccion fecha local gps").limit(5);

        // Utiliza un conjunto para mantener un registro de direcciones únicas
        const direccionesUnicas = new Set();

        // Filtra los resultados para eliminar direcciones duplicadas
        const pedidosFiltrados = pedidosSinGPS.filter(pedido => {
            if (!direccionesUnicas.has(pedido.direccion)) {
                direccionesUnicas.add(pedido.direccion);
                return true;
            }
            return false;
        });

        // Ordena los pedidos por fecha en formato "YYYY-MM-DD" de manera descendente
        pedidosFiltrados.sort((a, b) => {
            const fechaA = a.fecha;
            const fechaB = b.fecha;
            if (fechaA < fechaB) return 1; // Orden descendente
            if (fechaA > fechaB) return -1;
            return 0;
        });

        res.json(pedidosFiltrados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los pedidos sin GPS." });
    }
};

const obtenerPedidosPorFechaYDriver = async (req, res) => {
    const { fecha, driver } = req.body; // Recuperar fecha y ID del driver desde el cuerpo de la solicitud

    const query = {
        fecha,
        driver: driver // Filtrar por el ID del driver
    };

    const pedidos = await Pedido.find(query)
        .populate({
            path: "driver",
            select: "nombre"
        })
        .populate({
            path: "local",
            select: "nombre"
        })
        .populate({
            path: "generadoPor",
            select: "nombre"
        })
        .select("-detallePedido -gps -gpsCreacion -horaCreacion -medioDePago -tipoPedido");

    res.json(pedidos);
};

const obtenerPedidosPorFechasYLocal = async (req, res) => {
    const { fechas, localIds } = req.body;


    if (!Array.isArray(fechas) || fechas.length === 0) {
        return res.status(400).json({ message: "El arreglo de fechas es inválido o está vacío." });
    }

    let query = { fecha: { $in: fechas } };

    if (Array.isArray(localIds) && localIds.length > 0) {
        query.local = { $in: localIds };
    }

    const pedidos = await Pedido.find(query)
        .populate({ path: "driver", select: " nombre" })
        .populate({ path: "local", select: "nombre" })
        .populate({ path: "generadoPor", select: "nombre" })
        .select("cobrar horaLlegadaLocal detallePedido horaRecojo horaEntrega comVenta createdAt delivery direccion estadoPedido fecha hora telefono tipoPedido")
        .sort({ fecha: 1 });



    res.json(pedidos);
};

const obtenerMotorizados = async (req, res) => {
    const motorizados = await Usuario.find({ rol: "motorizado", habilitado: true }).select(
        " -createdAt   -password -rol -token -updatedAt -__v "
    ).sort({ nombre: 1 });;

    res.json(motorizados)
};

const obtenerMotorizadosActivos = async (req, res) => {
    try {
        const motorizados = await Usuario.find({
            rol: "motorizado",
            habilitado: true,
            activo: true,
            estadoUsuario: "Libre"
        })
            .select("nombre horaActivacion telefono") // Selecciona solo los campos necesarios
            .sort({ horaActivacion: 1 }); // Ordena por horaActivacion, el más antiguo primero

        res.json(motorizados);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los motorizados activos" });
    }
};

const obtenerLocales = async (req, res) => {
    const locales = await Local.find({ habilitado: true }).select(
        " -colaboradores  -createdAt -updatedAt -__v"
    ).sort({ nombre: 1 });

    res.json(locales);
};

const obtenerClientes = async (req, res) => {
    const { telefono } = req.body; // Corregir aquí
    const clientes = await Cliente.find({ telefono });



    res.json(clientes);
};

const obtenerPedidosSocio = async (req, res) => {
    const { organizacion } = req.body;
    const pedidosSocio = await Pedido.find({ local: organizacion }).populate({ path: "driver", select: "nombre" }).select("cobrar horaLlegada horaRecojo hora fecha createdAt estadoPedido delivery direccion telefono local medioDePago tipoPedido")
    res.json(pedidosSocio);

};

const obtenerPedidosMotorizado = async (req, res) => {
    const { driver } = req.body;
    const pedidosMotorizado = await Pedido.find({ driver }).populate("driver").populate("local")
    res.json(pedidosMotorizado)
};

const aceptarPedido2 = async (req, res) => {
    const { id } = req.params;

    try {
        const pedido = await Pedido.findById(id);
        const { idTelegram } = await Local.findById(pedido.local).select("idTelegram");

        console.log(idTelegram);



        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        if (!pedido.driver) {
            pedido.driver = req.body.driver;
            pedido.estadoPedido = "pendiente"
            const pedidoGuardado = await pedido.save();
            res.json(pedidoGuardado);

            sendMessageWithId(idTelegram, `Pedido:\n${pedido.direccion}\nha sido aceptado por motorizado`)
        } else {
            const error = new Error("Pedido ya ha sido tomado");
            return res.status(400).json({ msg: error.message });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

const aceptarPedido = async (req, res) => {
    const { id } = req.params;

    console.log("driver: " + req.body.driver);
    console.log("idPedido: "+ id);
    

    try {
        const pedido = await Pedido.findById(id);
        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        

        const local = await Local.findById(pedido.local).select("idTelegram");
        console.log(local.idTelegram);
        const idTelegram = local?.idTelegram; // Usar optional chaining para evitar errores si local es null

        console.log('ID de Telegram:', idTelegram); 
        
        if (pedido.idMensajeTelegram && pedido.idTelegram) {
            await deleteMessageWithId(pedido.idTelegram, pedido.idMensajeTelegram);
          }// Verificar el valor del ID de Telegram

        if (!pedido.driver) {
            pedido.driver = req.body.driver;
            pedido.estadoPedido = "pendiente";
            pedido.idTelegram = idTelegram;
            const pedidoGuardado = await pedido.save();


            const usuario = await Usuario.findById(req.body.driver)
            usuario.estadoUsuario = "Con pedido"
            await usuario.save();

            // Enviar mensaje y guardar el ID del mensaje en el pedido
            if (idTelegram) {
                const mensaje = await sendMessageWithId(idTelegram, `🛵 Pedido aceptado:\n\nHora: ${pedido.hora}\nDireccion:${pedido.direccion}\n\nha sido aceptado por motorizado`);
                pedido.idMensajeTelegram = mensaje.message_id; // Guardar el ID del mensaje
                await pedido.save();
            } else {
                console.error('ID de Telegram no disponible');
            }

            res.json(pedidoGuardado);
        } else {
            const error = new Error("Pedido ya ha sido tomado");
            return res.status(400).json({ msg: error.message });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

const liberarPedido = async (req, res) => {
    const { id } = req.params;

    try {
        const pedido = await Pedido.findById(id);

        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        if (pedido.driver) {
            pedido.driver = undefined;
            pedido.estadoPedido = "sin asignar" // Eliminar el valor del campo driver
            const pedidoGuardado = await pedido.save();
            res.json(pedidoGuardado);
        } else {
            const error = new Error("El pedido no tiene asignado un conductor");
            return res.status(400).json({ msg: error.message });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

const marcarPedidoEnLocal2 = async (req, res) => {
    const { id } = req.params;

    try {
        const pedido = await Pedido.findById(id);

        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        pedido.estadoPedido = "en local";
        pedido.horaLlegadaLocal = new Date().toISOString(); // Cambiar el estado del pedido
        const pedidoGuardado = await pedido.save();
        res.json(pedidoGuardado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

const marcarPedidoEnLocal = async (req, res) => {
    const { id } = req.params;
  
    try {
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        const error = new Error("Pedido no encontrado");
        return res.status(404).json({ msg: error.message });
      }
  
      // Eliminar mensaje anterior
      if (pedido.idMensajeTelegram && pedido.idTelegram) {
        await deleteMessageWithId(pedido.idTelegram, pedido.idMensajeTelegram);
      }
  
      pedido.estadoPedido = "en local";
      pedido.horaLlegadaLocal = new Date().toISOString();
      const pedidoGuardado = await pedido.save();
  
      // Enviar nuevo mensaje
      if (pedido.idTelegram) { // Verificar que idTelegram no es null
        const mensaje = await sendMessageWithId(pedido.idTelegram, `📍Pedido en espera:\n\nHora: ${pedido.hora}\nDireccion: ${pedido.direccion}\n\nestá esperando en el local.`);
        pedido.idMensajeTelegram = mensaje.message_id; // Guardar nuevo ID del mensaje
        await pedido.save();
      } else {
        console.error('Chat ID is missing for sending the message');
      }
  
      res.json(pedidoGuardado);
    } catch (error) {
      console.log(error);
      res.status(500).json({ msg: "Error interno del servidor" });
    }
  };

const marcarPedidoRecogido = async (req, res) => {
    const { id } = req.params;

    try {
        const pedido = await Pedido.findById(id);

        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        pedido.estadoPedido = "recogido";
        pedido.horaRecojo = new Date().toISOString();  // Cambiar el estado del pedido
        const pedidoGuardado = await pedido.save();
        res.json(pedidoGuardado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

const actualizarCoordenadasPedido = async (req, res) => {
    const { id } = req.params;
    const { coordenadas } = req.body; // Se espera que el cuerpo de la solicitud contenga las coordenadas en formato de cadena

    try {
        const pedido = await Pedido.findById(id);

        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        // Actualizar las coordenadas del pedido
        pedido.gps = coordenadas;

        const pedidoGuardado = await pedido.save();
        res.json(pedidoGuardado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};


// const marcarPedidoEntregado = async (req, res) => {
//     const { id } = req.params;

//     try {
//         const pedido = await Pedido.findById(id);

//         if (!pedido) {
//             const error = new Error("Pedido no encontrado");
//             return res.status(404).json({ msg: error.message });
//         }

//         pedido.estadoPedido = "entregado";
//         pedido.horaEntrega = new Date().toISOString();  // Cambiar el estado del pedido
//         const pedidoGuardado = await pedido.save();
//         res.json(pedidoGuardado);
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ msg: "Error interno del servidor" });
//     }
// };

const marcarPedidoEntregado = async (req, res) => {
    const { id } = req.params;

    console.log("driver: " +req.body.driver);
    console.log("idPedido: "+ id);

    

    

    try {
        const pedido = await Pedido.findById(id);

        if (pedido.idMensajeTelegram && pedido.idTelegram) {
            await deleteMessageWithId(pedido.idTelegram, pedido.idMensajeTelegram);
          }

        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        pedido.estadoPedido = "entregado";
        pedido.horaEntrega = new Date().toISOString();
        const pedidoGuardado = await pedido.save();

        const horaEntregaFormateada = formatHoraEntrega(pedido.horaEntrega);

        if (pedido.idTelegram) {
            const mensaje = await sendMessageWithId(pedido.idTelegram, `✅Pedido entregado:\n\nHora: ${pedido.hora}\nDireccion: ${pedido.direccion}\n\nha sido entregado con éxito a las:\n${horaEntregaFormateada}.`);
            pedido.idMensajeTelegram = mensaje.message_id;
            await pedido.save();
        } else {
            console.error('ID de Telegram no disponible');
        }

        res.json(pedidoGuardado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};





export {
    nuevoPedido,
    obtenerPedido,
    editarPedido,
    eliminarPedido,
    eliminarPedidoSocio,
    asignarMotorizado,
    obtenerPedidosMotorizadoLogueado,
    obtenerPedidosNoEntregados,
    obtenerUltimosVeintePedidos,
    obtenerPedidosSocio,
    obtenerPedidosMotorizado,
    obtenerPedidoSocio,
    obtenerPedidosPorFecha,
    obtenerMotorizados,
    obtenerLocales,
    obtenerClientes,
    aceptarPedido,
    liberarPedido,
    marcarPedidoEnLocal,
    marcarPedidoRecogido,
    marcarPedidoEntregado,
    obtenerPedidosPorFechasYLocal,
    obtenerPedidosPorFechaYDriver,
    obtenerPedidosPorTelefonoConGps,
    obtenerPedidosSinGPS,
    obtenerPedidosPorTelefono,
    obtenerPedidosPorTelefonoYLocal,
    actualizarCoordenadasPedido,
    obtenerMotorizadosActivos,
    nuevoPedidoSocio,
    obtenerPedidosPorTelefonoYLocalYGpsVacio,
    obtenerPedidosNoEntregadosPorLocal
};
