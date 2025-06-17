import Pedido from "../models/Pedido.js";
import PedidoApp from "../models/PedidoApp.js";
import EnvioPaquete from "../models/EnvioPaquete.js";
import Usuario from "../models/Usuario.js";
import Local from "../models/Local.js";
import Cliente from "../models/Cliente.js";
import { Server } from 'socket.io';
import { sendMessage, sendMessageWithId, deleteMessageWithId } from "../bot/bot.js";
import { coordenadasPoligonoInicial, coordenadasPoligonoSecundario } from "../files/coordenadas.js";
import { enviarMensajeAsignacion, startSock } from "../bot/botWhatsapp.js";
import moment from 'moment-timezone'; // Para un manejo robusto de fechas y zonas horarias


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
            "-createdAt -gpsCreacion -horaCreacion -updatedAt -__v "
        )
        .sort({
            hora: 1  // Orden ascendente por el campo 'hora'
        });
    res.json(pedidos);
};

const obtenerPedidosNoEntregadosSinDriver = async (req, res) => {


    const pedidos = await Pedido.find({
        estadoPedido: { $in: ["pendiente", "recogido", "sin asignar", "en local"] },
        $or: [{ driver: { $exists: false } }] // Filtra solo los pedidos de hoy
    })
        .populate({ path: "generadoPor", select: "nombre" })
        .populate({ path: "local", select: "nombre gps" })
        .select("-gpsCreacion -horaCreacion -updatedAt -__v")
        .sort({ hora: 1 });

    res.json(pedidos);

};


const obtenerPedidosAsignados = async (req, res) => {
    const pedidos = await Pedido.find({
        estadoPedido: ["pendiente", "recogido", "sin asignar", "en local"],
        driver: req.usuario._id
    })
        .populate({
            path: "generadoPor",
            select: "nombre"
        })
        .populate({
            path: "driver",
            select: "nombre"
        })
        .populate({
            path: "local",
            select: "nombre gps direccion"
        })
        .populate({
            path: "pedido.producto", // Aquí es donde haces el populate de productos
            select: "nombre precio local categoria taper",
            populate: { // Aquí se hace el populate del campo local dentro de producto
                path: "local", // Asegúrate de que el campo local en producto sea una referencia válida
                select: "nombre adicionalPorTaper " // Selecciona los campos que necesitas
            }
        })
        .select("-createdAt -gpsCreacion -horaCreacion -updatedAt -__v")
        .sort({ hora: 1 }); // Orden ascendente por el campo 'hora'

    res.json(pedidos);
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

const obtenerPedidosMotorizadoLogueado = async (req, res) => {
    const pedidos = await Pedido.find({
        estadoPedido: ["pendiente", "recogido", "sin asignar", "en local"],
    })
        .where("driver")
        .equals(req.usuario);

    res.json(pedidos);
};

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

const obtenerPedido = async (req, res) => {
    const { id } = req.params;

    const pedido = await Pedido.findById(id)
        .populate({
            path: "driver",
            select: "nombre email telefono rol",
        })
        .populate({
            path: "generadoPor",
            select: "nombre telefono",
            populate: {
                path: "organizacion",
                select: "nombre",
            },
        })
        .populate({
            path: "local",
            select: "nombre direccion gps telefono idTelegram",
        })
        .populate({
            path: "pedido.producto",
            select: "categoria nombre local",
            populate: {
                path: "local", // Aquí indicamos que también queremos poblar el campo `local`
                select: "nombre ", // Selecciona los campos que deseas de `local`
            }
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

const obtenerPedidoPorTelefono = async (req, res) => {
    const { telefono } = req.body;




    const pedido = await Pedido.findOne({ telefono: telefono, estadoPedido: ["pendiente", "recogido", "sin asignar", "en local"], })
        .select("estadoPedido direccion hora cobrar delivery horaRecojo") // Seleccionamos los campos específicos
        .populate({
            path: "local",
            select: "nombre" // Solo mostramos el nombre del local
        })
        .populate({
            path: "driver",
            select: "nombre" // Solo mostramos el nombre del driver
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
            select: "nombre telefono yape plin",
        })
        .populate({
            path: "local",
            select: "nombre",
        })
        .populate({
            path: "cliente",
            select: "",
        }).select("-comVenta -generadoPor -gpsCreacion -horaCreacion -idMensajeTelegram -idTelegram -tipoPedido -updatedAt -__v")

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

// const asignarMotorizado = async (req, res) => {
//     const { idPedido, idDriver } = req.body;



//     try {
//         const pedido = await Pedido.findById(idPedido);
//         if (!pedido) {
//             const error = new Error("Pedido no encontrado");
//             return res.status(404).json({ msg: error.message });
//         }

//         const local = await Local.findById(pedido.local).select("idTelegram");
//         const idTelegram = local?.idTelegram; // Usar optional chaining para evitar errores si local es null

//         console.log('ID de Telegram:', idTelegram);

//         if (pedido.idMensajeTelegram && pedido.idTelegram) {
//             await deleteMessageWithId(pedido.idTelegram, pedido.idMensajeTelegram);
//         }

//         if (!pedido.driver) {
//             pedido.driver = idDriver;
//             pedido.estadoPedido = "pendiente";
//             pedido.idTelegram = idTelegram;
//             const pedidoGuardado = await pedido.save();

//             const usuario = await Usuario.findById(idDriver);
//             if (!usuario) {
//                 const error = new Error("Usuario no encontrado");
//                 return res.status(404).json({ msg: error.message });
//             }
//             usuario.estadoUsuario = "Con pedido";
//             await usuario.save();

//             // Enviar mensaje y guardar el ID del mensaje en el pedido
//             if (idTelegram) {
//                 const mensaje = await sendMessageWithId(idTelegram, `🛵 Pedido asignado:\n\nHora: ${pedido.hora}\nDireccion:${pedido.direccion}\n\nha sido aceptado por motorizado`);
//                 pedido.idMensajeTelegram = mensaje.message_id; // Guardar el ID del mensaje
//                 await pedido.save();
//             } else {
//                 console.error('ID de Telegram no disponible');
//             }

//             res.json(pedidoGuardado);
//         } else {
//             const error = new Error("Pedido ya ha sido tomado");
//             return res.status(400).json({ msg: error.message });
//         }
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ msg: "Error interno del servidor" });
//     }
// };


const asignarMotorizado = async (req, res) => {
    const { idPedido, idDriver } = req.body;

    try {
        const pedido = await Pedido.findById(idPedido).populate('local', 'nombre');
        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        const local = pedido.local;
        const idTelegram = local?.idTelegram;

        console.log('ID de Telegram:', idTelegram);

        if (pedido.idMensajeTelegram && pedido.idTelegram) {
            await deleteMessageWithId(pedido.idTelegram, pedido.idMensajeTelegram);
        }

        if (!pedido.driver) {
            pedido.driver = idDriver;
            pedido.estadoPedido = "pendiente";
            pedido.idTelegram = idTelegram;
            const pedidoGuardado = await pedido.save();

            const driver = await Usuario.findById(idDriver); // Busca el usuario por idDriver
            if (!driver) {
                const error = new Error("Usuario no encontrado");
                return res.status(404).json({ msg: error.message });
            }
            driver.estadoUsuario = "Con pedido";
            await driver.save();

            // Enviar mensaje a Telegram
            if (idTelegram) {
                const mensajeTelegram = await sendMessageWithId(idTelegram, `🛵 Pedido asignado:\n\nHora: ${pedido.hora}\nDireccion:${pedido.direccion}\n\nha sido aceptado por motorizado`);
                pedido.idMensajeTelegram = mensajeTelegram.message_id;
                await pedido.save();
            } else {
                console.error('ID de Telegram no disponible');
            }

            // Enviar mensaje a WhatsApp
            if (driver?.telefono) {
                const numeroWhatsApp = `51${driver.telefono}`;
                let nombresLocales = '';
                if (local && Array.isArray(local) && local.length > 0) {
                    nombresLocales = local.map(loc => loc.nombre.toUpperCase()).join(', '); // Convierte a mayúsculas
                } else {
                    nombresLocales = 'Nombre no disponible';
                }
                const mensajeWhatsApp = `🛵 ¡Nuevo Pedido Asignado! ✅\n\n*Local(es):* _${nombresLocales}_\n*Hora:* ${pedido.hora}\n*Dirección:* ${pedido.direccion}`;
                try {
                    // Intenta enviar el mensaje
                    await enviarMensajeAsignacion(numeroWhatsApp, mensajeWhatsApp);
                } catch (error) {
                    console.error('Error al enviar mensaje de WhatsApp:', error);
                    res.status(500).json({ msg: "Error al enviar mensaje de WhatsApp" }); // Devuelve un error para que se maneje en la aplicación
                }
            } else {
                console.error('Número de teléfono del usuario no disponible.');
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

        .select("-detallePedido -gps -gpsCreacion -horaCreacion -medioDePago");

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
            .sort({ fecha: -1 })
            .limit(5); // Ordena los pedidos por fecha en orden descendente

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
        console.log(resultado);

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

const obtenerPedidosPorTelefonoYLocalYGpsVacio2 = async (req, res) => {
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
            .select("delivery direccion fecha telefono")
            .sort({ fecha: -1 })
            .limit(6);

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

        // Filtro por teléfono y localId
        const filtro = {
            telefono,
            local: localId
        };

        // Buscar pedidos con el filtro
        const pedidos = await Pedido.find(filtro)
            .select("delivery direccion fecha gps telefono local")
            .populate("local", "nombre")
            .sort({ fecha: -1 });



        // Utilizar JavaScript para encontrar el pedido con el delivery más alto para cada dirección
        const pedidosConMaxDelivery = {};
        pedidos.forEach(pedido => {
            const direccion = pedido.direccion;
            if (!pedidosConMaxDelivery[direccion] ||
                parseFloat(pedido.delivery) > parseFloat(pedidosConMaxDelivery[direccion].delivery)) {
                pedidosConMaxDelivery[direccion] = pedido;
            }
        });

        // Convertir el objeto a un arreglo
        const resultados = Object.values(pedidosConMaxDelivery);

        res.json(resultados);
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
        .select("-gps -gpsCreacion -horaCreacion -medioDePago")
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

const aceptarPedido = async (req, res) => {
    const { id } = req.params;

    console.log("driver: " + req.body.driver);
    console.log("idPedido: " + id);


    try {
        const pedido = await Pedido.findById(id);
        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }


        const driver = await Usuario.findById(req.body.driver).select("nombre")
        const local = await Local.findById(pedido.local).select("idTelegram");

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
                const mensaje = await sendMessageWithId(idTelegram, `🛵 Pedido aceptado:\n\nHora: ${pedido.hora}\nDireccion:${pedido.direccion}\n\nha sido aceptado por ${driver.nombre}`);
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
            const driver = await Usuario.findById(pedido.driver).select("nombre");
            const local = await Local.findById(pedido.local).select("idTelegram");

            const idTelegram = -4112441362; // Usar optional chaining para evitar errores si local es null
            console.log('ID de Telegram:', idTelegram);

            // Enviar mensaje de liberación de pedido
            if (idTelegram) {
                try {
                    await sendMessageWithId(
                        idTelegram,
                        `🔄 Pedido liberado:\n\nHora: ${pedido.hora}\nDirección: ${pedido.direccion}\n\nha sido liberado por ${driver.nombre}.`
                    );
                } catch (error) {
                    console.error("Error enviando el mensaje de Telegram: ", error);
                }
            } else {
                console.error("ID de Telegram no disponible");
            }

            // Liberar el pedido
            pedido.driver = undefined;
            pedido.estadoPedido = "sin asignar"; // Cambiar el estado del pedido
            const pedidoGuardado = await pedido.save();

            // Actualizar estado del conductor
            driver.estadoUsuario = "Disponible";
            await driver.save();

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

const marcarPedidoEnLocal = async (req, res) => {
    const { id } = req.params;

    try {
        const pedido = await Pedido.findById(id);
        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        // Intentar eliminar el mensaje anterior
        if (pedido.idMensajeTelegram && pedido.idTelegram) {
            try {
                await deleteMessageWithId(pedido.idTelegram, pedido.idMensajeTelegram);
            } catch (error) {
                if (error.response?.error_code === 400) {
                    console.warn("No se pudo eliminar el mensaje: " + error.response.description);
                } else {
                    console.error("Error eliminando el mensaje: ", error);
                }
            }
        }

        // Actualizar el estado del pedido
        pedido.estadoPedido = "en local";
        pedido.horaLlegadaLocal = new Date().toISOString();
        const pedidoGuardado = await pedido.save();

        // Enviar nuevo mensaje
        if (pedido.idTelegram) { // Verificar que idTelegram no es null
            try {
                const mensaje = await sendMessageWithId(
                    pedido.idTelegram,
                    `📍Pedido en espera:\n\nHora: ${pedido.hora}\nDireccion: ${pedido.direccion}\n\nestá esperando en el local.`
                );
                pedido.idMensajeTelegram = mensaje.message_id; // Guardar nuevo ID del mensaje
                await pedido.save();
            } catch (error) {
                console.error("Error enviando el mensaje de Telegram: ", error);
            }
        } else {
            console.error("Chat ID is missing for sending the message");
        }

        res.json(pedidoGuardado);
    } catch (error) {
        console.error("Error interno del servidor: ", error);
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
        const driver = await Usuario.findById(pedido.driver).select("nombre");

        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        // Actualizar las coordenadas del pedido
        pedido.gps = coordenadas;
        const pedidoGuardado = await pedido.save();

        // Obtener el ID de Telegram del local asociado al pedido
        const local = await Local.findById(pedido.local).select("idTelegram");
        const idTelegram = -4112441362; // Usar optional chaining para evitar errores si local es null

        // Enviar mensaje de actualización de coordenadas
        if (idTelegram) {
            try {
                await sendMessageWithId(
                    idTelegram,
                    `📍 Las coordenadas del pedido ${pedido.direccion} se han actualizado:\n\nHora: ${pedido.hora}\nNueva ubicación GPS: ${coordenadas}\nDriver: ${driver.nombre}`
                );
            } catch (error) {
                console.error("Error enviando el mensaje de Telegram: ", error);
            }
        } else {
            console.error("ID de Telegram no disponible");
        }

        res.json(pedidoGuardado);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

const marcarPedidoEntregado = async (req, res) => {
    const { id } = req.params;

    console.log("driver: " + req.body.driver);
    console.log("idPedido: " + id);

    try {
        const pedido = await Pedido.findById(id);
        const driver = await Usuario.findById(req.body.driver).select("nombre");

        if (!pedido) {
            const error = new Error("Pedido no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        // Eliminar mensaje anterior de Telegram
        if (pedido.idMensajeTelegram && pedido.idTelegram) {
            await deleteMessageWithId(pedido.idTelegram, pedido.idMensajeTelegram);
        }

        // Actualizar estado del pedido a entregado
        pedido.estadoPedido = "entregado";
        pedido.horaEntrega = new Date().toISOString();
        const pedidoGuardado = await pedido.save();

        // ID alternativo de Telegram para mensajes sin GPS
        const idTelegramAlternativo = -4112441362; // Configura este valor en tus variables de entorno

        // Verificar existencia de ID de Telegram y GPS
        if (pedido.idTelegram || idTelegramAlternativo) {
            let mensajeTexto;

            if (pedido.gps && pedido.gps.trim() !== "") {
                // Mensaje con GPS
                mensajeTexto = `✅Pedido entregado:\n\nHora: ${pedido.hora}\nDireccion: ${pedido.direccion}\n\nha sido entregado con éxito.\nCoordenadas GPS: ${pedido.gps}`;
            } else {
                // Mensaje sin GPS
                mensajeTexto = `⚠️Pedido entregado sin marcar coordenadas GPS:\n\nHora: ${pedido.hora}\nDireccion: ${pedido.direccion}.`;

                // Enviar mensaje al ID alternativo
                try {
                    await sendMessageWithId(
                        idTelegramAlternativo,
                        `⚠️Alerta: Se entregó un pedido sin marcar coordenadas GPS:\n\nHora: ${pedido.hora}\nDireccion: ${pedido.direccion}\nDriver: ${driver.nombre}.`
                    );
                    console.log("Mensaje enviado al ID alternativo");
                } catch (error) {
                    console.error("Error enviando mensaje al ID alternativo: ", error);
                }
            }

            // Enviar mensaje principal al ID de Telegram del local (si existe)
            if (pedido.idTelegram) {
                try {
                    const mensaje = await sendMessageWithId(pedido.idTelegram, mensajeTexto);
                    pedido.idMensajeTelegram = mensaje.message_id;
                    await pedido.save();
                } catch (error) {
                    console.error("Error enviando mensaje de Telegram: ", error);
                }
            }
        } else {
            console.error("ID de Telegram no disponible ni alternativo configurado");
        }

        res.json(pedidoGuardado);


    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

const asignadorPedidosAuto = async () => {
    const usuariosMotorizados = await Usuario.find({
        rol: 'motorizado',
        habilitado: true,
        estadoUsuario: 'libre'
    });

    const pedidos = await Pedido.find({
        estadoPedido: 'pendiente',
        fecha: fechaActual.toLocaleDateString(),
        hora: {
            $gte: fechaActual.toLocaleTimeString(),
            $lte: new Date(fechaActual.getTime() + 10 * 60 * 1000).toLocaleTimeString()
        }
    });



};

const calcularPrecioDelivery = async (req, res) => {
    const { startLocation, endLocation } = req.body;
    console.log(startLocation);
    console.log(endLocation);



    if (!startLocation || !endLocation) {
        const error = new Error("Faltan coordenadas");
        return res.status(400).json({ msg: error.message });
    }

    // Polígono fijo dentro del servidor (Huaraz, por ejemplo)
    const polygonPoints = [
        { lat: -9.4708529333816, lng: -77.53900559802246 },
        { lat: -9.485075647727568, lng: -77.53754647631835 },
        { lat: -9.495065058783174, lng: -77.54097970385742 },
        { lat: -9.505308135424293, lng: -77.53565820117187 },
        { lat: -9.514873706996264, lng: -77.5344565715332 },
        { lat: -9.525528, lng: -77.538277 },
        { lat: -9.532776690015144, lng: -77.53385575671386 },
        { lat: -9.540902556849755, lng: -77.53282578845214 },
        { lat: -9.540987200276897, lng: -77.52591641802978 },
        { lat: -9.541025701512503, lng: -77.52136739154052 },
        { lat: -9.538676838874489, lng: -77.51857789416503 },
        { lat: -9.52989491183207, lng: -77.51836331744384 },
        { lat: -9.518080324816905, lng: -77.51967012566254 },
        { lat: -9.512526061659475, lng: -77.52197034650264 },
        { lat: -9.508399326193132, lng: -77.52776391797481 },
        { lat: -9.505099580392088, lng: -77.53194441821546 },
        { lat: -9.49451787796985, lng: -77.53507723834485 },
        { lat: -9.468371, lng: -77.535545 },
    ];

    try {
        const result = calculateDistanceAndPrice(startLocation, endLocation, polygonPoints);
        res.json(result); // Devuelve { distance, price }
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al calcular el precio de delivery" });
    }
};



const obtenerLocalPorTelefono = async (req, res) => {
    let { telefono } = req.body;

    // Eliminar espacios en blanco del número recibido
    telefono = telefono.replace(/\s+/g, '');
    console.log('Teléfono limpio:', telefono);

    try {
        // Buscar tanto con espacios como sin espacios en telefonoUno y telefonoDos
        const local = await Local.findOne({
            $or: [
                { telefonoUno: telefono },
                { telefonoUno: { $regex: telefono.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') } },
                { telefonoDos: telefono },
                { telefonoDos: { $regex: telefono.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') } }
            ]
        }).select('nombre gps');

        if (!local) {
            return res.status(404).json({ msg: 'Local no encontrado' });
        }

        res.json(local);
        console.log(local);

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener el local' });
    }
};








// empieza la version dos de calculo de distancia
export function calculateDistanceAndPrice(start, end, coordenadasPoligonoInicial, coordenadasPoligonoSecundario) {
    // Verificamos si tenemos todos los datos necesarios
    if (!start || !end || !coordenadasPoligonoInicial || !coordenadasPoligonoSecundario) {
        console.error("Faltan datos para el cálculo");
        return {
            hasService: false,
            message: "Datos insuficientes para el cálculo"
        };
    }

    // Calcular la distancia física entre los puntos
    const distanceInMeters = calculateHaversineDistance(
        start.lat,
        start.lng,
        end.lat,
        end.lng
    );
   
    
    // Verificar si los puntos están dentro de los polígonos
    const startInsideInitialPolygon = pointInPolygon(start, coordenadasPoligonoInicial);
    const endInsideInitialPolygon = pointInPolygon(end, coordenadasPoligonoInicial);
    
    const startInsideSecondaryPolygon = pointInPolygon(start, coordenadasPoligonoSecundario);
    const endInsideSecondaryPolygon = pointInPolygon(end, coordenadasPoligonoSecundario);
    
   

    // Regla 1: Si cualquier punto está fuera del polígono secundario, no hay servicio
    if (!startInsideSecondaryPolygon || !endInsideSecondaryPolygon) {
        return {
            distance: distanceInMeters,
            price: 0,
            hasService: false,
            message: "Lo sentimos, no hay cobertura para esta ubicación"
        };
    }

    // Variables para tracking
    let hasService = true;
    let distanceMultiplier = 1;

    // Regla 2: Si ambos puntos están dentro del polígono inicial, multiplicador = 1
    if (startInsideInitialPolygon && endInsideInitialPolygon) {
        distanceMultiplier = 1;
    } 
    // Regla 3: Si al menos un punto está fuera del polígono inicial pero ambos dentro del secundario, multiplicador = 2.1
    else if (!startInsideInitialPolygon || !endInsideInitialPolygon) {
        distanceMultiplier = 2.1;
    }

    const distanceWithMultiplier = distanceInMeters * distanceMultiplier;
    
    const price = Math.ceil((distanceWithMultiplier + 4.5) * 2) / 2;
    

    const result = {
        distance: distanceWithMultiplier,        
        price: Math.ceil(price),
        hasService: true,
        multiplier: distanceMultiplier
    };

    return result;
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km

    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
            Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distancia en km

    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Algoritmo de punto en polígono mejorado para mayor precisión
function pointInPolygon(point, polygonPoints) {
    // Validación de entrada
    if (!point || !point.lat || !point.lng || !Array.isArray(polygonPoints) || polygonPoints.length < 3) {
        console.error("Datos inválidos para la verificación del polígono");
        return false;
    }

    let inside = false;
    const x = point.lng;
    const y = point.lat;

    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
        // Verificar que tenemos coordenadas válidas
        if (!polygonPoints[i].lat || !polygonPoints[i].lng || !polygonPoints[j].lat || !polygonPoints[j].lng) {
            console.error(`Coordenada inválida en el polígono en índice ${i} o ${j}`);
            continue;
        }

        const xi = polygonPoints[i].lng;
        const yi = polygonPoints[i].lat;
        const xj = polygonPoints[j].lng;
        const yj = polygonPoints[j].lat;

        // Algoritmo ray-casting para determinar si el punto está dentro del polígono
        const intersect = ((yi > y) !== (yj > y)) && 
                          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
}



const calcularPrecioDeliveryDos = async (req, res) => {
    const { startLocation, endLocation } = req.body;
    console.log(startLocation);
    console.log(endLocation);

    if (!startLocation || !endLocation) {
        const error = new Error("Faltan coordenadas");
        return res.status(400).json({ msg: error.message });
    }

    try {
        // Usar ambos polígonos en la función actualizada
        const result = calculateDistanceAndPrice(
            startLocation, 
            endLocation, 
            coordenadasPoligonoInicial, 
            coordenadasPoligonoSecundario
        );
        
        // Si no hay servicio, devolver una respuesta diferente
        if (!result.hasService) {
            return res.status(400).json({ 
                msg: result.message,
                hasService: false
            });
        }
        
        res.json(result); // Devuelve { distance, price, hasService, multiplier }
        console.log(result);
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al calcular el precio de delivery" });
    }
};



export const obtenerTodosLosPedidosSinDriver = async (req, res) => {
    try {
        let allOrders = [];

        // --- 1. Obtener Pedidos Express (Modelo Pedido) ---
        // Se asume que 'Pedido' es tu modelo para pedidos Express.
        const expressOrders = await Pedido.find({
            estadoPedido: { $in: ["pendiente", "recogido", "sin asignar", "en local"] }, // Ajusta si estos estados cambian en tu modelo Pedido
            driver: { $exists: false } // Condición para que no tenga driver asignado
        })
            .populate({ path: "generadoPor", select: "nombre" })
            .populate({ path: "local", select: "nombre gps" })
            .select("cobrar comVenta porcentPago delivery direccion fecha hora local gps telefono detallePedido medioDePago estadoPedido createdAt generadoPor")
            .sort({ fecha: -1, hora: -1 })
            .limit(20);

        const mappedExpressOrders = expressOrders.map(order => {
            const clientPhone = order.telefono || 'N/A';
            const deliveryCost = parseFloat(order.delivery || '0');
            const cobrar = parseFloat(order.cobrar || '0');
            const comVenta = parseFloat(order.comVenta || '0');
            const porcentPago = parseFloat(order.porcentPago || '0');
            const generadoPorNombre = order.generadoPor?.nombre || 'N/A';

            const orderDateISO = new Date(`${order.fecha}T${order.hora}:00.000Z`).toISOString();
            const storeDetails = {
                storeId: order.local?.[0]?._id?.toString() || null,
                nombre: order.local?.[0]?.nombre || 'Local desconocido',
                gps: order.local?.[0]?.gps || null,
            };

            return {
                id: order._id.toString(),
                tipoPedido: 'express',
                estadoPedido: order.estadoPedido, 
                clientName: 'Cliente Express',
                clientPhone: clientPhone,
                deliveryCost: deliveryCost,
                medioDePago: order.medioDePago,
                detail: order.detallePedido || '',
                orderItems: [],
                orderDate: orderDateISO,
                deliveryAddressDetails: {
                    fullAddress: order.direccion || '',
                    gps: order.gps || '0,0',
                    name: null,
                    reference: null,
                },
                storeDetails: storeDetails,
                createdAt: order.createdAt?.toISOString() || new Date(0).toISOString(),
                cobrar: cobrar,
                comVenta: comVenta,
                porcentPago: porcentPago,
                generadoPorName: generadoPorNombre,
            };
        });
        allOrders = [...allOrders, ...mappedExpressOrders];


        // --- 2. Obtener Pedidos de App (Modelo PedidoApp) ---
        const appOrders = await PedidoApp.find({
            driver: null, // Sin driver asignado
            // Los estados que indican que un pedido de app necesita un driver son:
            // 'nuevo' (recién creado, pendiente en la tienda),
            // 'preparando' (en preparación en la tienda),
            // 'listo_para_recojo' (debería venir de estadoTienda, pero en este modelo no hay un estado 'buscando_driver' explícito en estadoPedido para la app,
            // por lo que se asume que si el estado de tienda es 'listo_para_recojo' Y no hay driver, necesita uno).
            // NOTA: Con tu estadoPedido actual, 'nuevo' y 'preparando' son los que se deducen que están con la tienda.
            // Para 'buscando_driver', tu 'estadoPedido' no lo incluye explícitamente, pero si 'estadoTienda' es 'listo_para_recojo',
            // y no hay driver, también se buscaría. Aquí usaremos los estados de tu enum `estadoPedido`.
            estadoPedido: { $in: ['nuevo', 'preparando'] } // Incluye los estados de la tienda que esperan driver
            // Si un pedido está 'listo_para_recojo' en estadoTienda, tu lógica de backend debería
            // actualizar 'estadoPedido' a 'buscando_driver' (si existiera en tu enum de estadoPedido)
            // o a un estado que lo haga visible para los drivers.
            // Dada la ausencia de 'buscando_driver' en tu enum de estadoPedido, solo podemos usar los actuales.
        })
            .populate('userId', 'nombre telefono')
            .populate({
                path: 'storeDetails.storeId',
                select: 'nombre gps' // Tu AppStoreDetailsSchema actual no tiene 'manejaEstadosTienda' ni 'tiempoEstimadoPreparacion'
            })
            .select("numeroPedido subtotal porcentPago deliveryCost totalAmount notes orderItems orderDate deliveryAddress storeDetails paymentMethod estadoPedido estadoTienda createdAt") // Se mantiene 'estadoTienda' aunque no esté en el populate de storeDetails
            .sort({ createdAt: 1 })
            .limit(20);

        const mappedAppOrders = appOrders.map(order => ({
            id: order._id.toString(),
            tipoPedido: 'app',
            estadoPedido: order.estadoPedido, 
            estadoTienda: order.estadoTienda, // Aquí se mapea el estado de la tienda
            clientName: order.userId?.nombre || 'N/A',
            clientPhone: order.userId?.telefono || 'N/A',
            deliveryCost: order.deliveryCost || 0,
            medioDePago: order.paymentMethod || 'efectivo',
            totalAmount: order.totalAmount || 0,
            notes: order.notes || '',
            orderItems: order.orderItems?.map(item => ({
                productId: item.productId?.toString() || '',
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                totalItemPrice: item.totalItemPrice || 0,
                selectedOptions: item.selectedOptions || [],
            })) || [],
            orderDate: order.orderDate?.toISOString() || new Date(0).toISOString(),
            deliveryAddressDetails: {
                name: order.deliveryAddress?.name || null, 
                fullAddress: order.deliveryAddress?.fullAddress || '', 
                gps: order.deliveryAddress?.gps || '0,0',
                reference: order.deliveryAddress?.reference || null, 
            },
            storeDetails: {
                storeId: order.storeDetails?.storeId?._id?.toString() || null,
                nombre: order.storeDetails?.storeId?.nombre || 'Tienda Desconocida',
                gps: order.storeDetails?.storeId?.gps || null,
                // No se pueden mapear 'manejaEstadosTienda' ni 'tiempoEstimadoPreparacion' aquí
                // porque no están en tu `AppStoreDetailsSchema` actual ni en el populate de `storeId`.
            },
            createdAt: order.createdAt?.toISOString() || new Date(0).toISOString(),
            numeroPedido: order.numeroPedido || null,
            subTotal: order.subtotal || 0, 
            porcentPago: order.porcentPago || 0,
        }));
        allOrders = [...allOrders, ...mappedAppOrders];


        // --- 3. Obtener Pedidos de Paquetería (Modelo EnvioPaquete) ---
        const packageOrders = await EnvioPaquete.find({ driverAsignado: null }) 
            .populate('cliente', 'nombre telefono')
            .select("costoEnvio distanciaEnvioKm medioDePago quienPagaEnvio horaRecojoEstimada notasPedido recojo entrega fechaCreacion estadoPedido createdAt")
            .sort({ fechaCreacion: -1 })
            .limit(20);

        const mappedPackageOrders = packageOrders.map(order => ({
            id: order._id.toString(),
            tipoPedido: 'paqueteria',
            estadoPedido: order.estadoPedido, 
            clientName: order.cliente?.nombre || 'N/A',
            clientPhone: order.cliente?.telefono || 'N/A',
            deliveryCost: order.costoEnvio || 0,
            distanceInKm: order.distanciaEnvioKm || 0,
            medioDePago: order.medioDePago || 'efectivo',
            porcentPago: order.porcentPago || 0.8,
            recojoDetails: {
                direccion: order.recojo?.direccion || '',
                referencia: order.recojo?.referencia || null,
                telefonoContacto: order.recojo?.telefonoContacto || null,
                detallesAdicionales: order.recojo?.detallesAdicionales || null,
                gps: (order.recojo?.gps?.latitude && order.recojo?.gps?.longitude)
                    ? `${order.recojo.gps.latitude},${order.recojo.gps.longitude}`
                    : '0,0',
            },
            deliveryAddressDetails: {
                fullAddress: order.entrega?.direccion || '',
                gps: (order.entrega?.gps?.latitude && order.entrega?.gps?.longitude)
                    ? `${order.entrega.gps.latitude},${order.entrega.gps.longitude}`
                    : '0,0',
                name: null,
                reference: order.entrega?.referencia || null,
                telefonoContacto: order.entrega?.telefonoContacto || null,
                detallesAdicionales: order.entrega?.detallesAdicionales || null,
            },
            notes: order.notasPedido || '', 
            orderDate: order.fechaCreacion?.toISOString() || new Date(0).toISOString(),
            horaRecojoEstimada: order.horaRecojoEstimada || null,
            createdAt: order.createdAt?.toISOString() || new Date(0).toISOString(),
        }));
        allOrders = [...allOrders, ...mappedPackageOrders];

        // --- Ordenamiento Final y Límite Global ---
        allOrders.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        const limitedOrders = allOrders.slice(0, 20);

        if (limitedOrders.length === 0) {
            return res.status(200).json({ msg: "No hay pedidos sin driver disponibles en este momento.", pedidos: [] });
        }

        res.status(200).json({ msg: "Pedidos sin driver encontrados.", pedidos: limitedOrders });

    } catch (error) {
        console.error('Error al obtener todos los pedidos sin driver:', error);
        res.status(500).json({ msg: 'Error interno del servidor al obtener pedidos.' });
    }
};


export const acceptAppOrder = async (req, res) => {
    const { id } = req.params; // ID del pedido a aceptar
    const driverId = req.usuario._id; // Asume que el ID del driver viene del token JWT autenticado
    console.log("id del usuario request ",req.usuario._id)

    if (!driverId) {
        console.log(`Error: No se encontró el ID del driver en la solicitud para el pedido de App ${id}`);
        return res.status(401).json({
            msg: 'No autorizado: ID de driver no disponible.',
        });
    }

    try {
        console.log(`Intentando aceptar pedido de App con ID: ${id} para driver: ${driverId}`);
        const order = await PedidoApp.findById(id);

        if (!order) {
            console.log(`Error: Pedido de App con ID ${id} no encontrado.`);
            return res.status(404).json({
                msg: 'Pedido de App no encontrado.',
            });
        }

        // Verifica si el pedido ya tiene un driver asignado
        if (order.driver) {
            console.log(`Advertencia: Pedido de App ${id} ya tiene driver asignado: ${order.driver}. No se permite reasignar.`);
            return res.status(400).json({
                msg: 'Este pedido de App ya ha sido aceptado por otro driver.',
            });
        }

        // Asigna el driver y actualiza el estado del pedido
        order.driver = driverId;
        order.estadoPedido = 'driver_asignado'; // O el estado apropiado, ej. 'en_recojo'
        order.fechaAceptacionDriver = new Date(); // Agrega la fecha de aceptación si tienes este campo

        await order.save();
        console.log(`✅ Pedido de App ${id} aceptado y asignado al driver ${driverId} con éxito.`);
        res.status(200).json({
            msg: 'Pedido de App aceptado con éxito.',
            order: order,
        });

    } catch (error) {
        console.log(`❌ Error al aceptar pedido de App ${id}: ${error.message}`);
        console.error('Error en acceptAppOrder:', error);
        res.status(500).json({
            msg: 'Error interno del servidor al aceptar pedido de App.',
        });
    }
};

// --- Función para aceptar un Pedido Express ---
export const acceptExpressOrder = async (req, res) => {
    const { id } = req.params; // ID del pedido a aceptar
    const driverId = req.usuario._id; // Asume que el ID del driver viene del token JWT autenticado

    if (!driverId) {
        console.log(`Error: No se encontró el ID del driver en la solicitud para el pedido Express ${id}`);
        return res.status(401).json({
            msg: 'No autorizado: ID de driver no disponible.',
        });
    }

    try {
        console.log(`Intentando aceptar pedido Express con ID: ${id} para driver: ${driverId}`);
        const order = await Pedido.findById(id);

        if (!order) {
            console.log(`Error: Pedido Express con ID ${id} no encontrado.`);
            return res.status(404).json({
                msg: 'Pedido Express no encontrado.',
            });
        }

        // Verifica si el pedido ya tiene un driver asignado
        if (order.driver) {
            console.log(`Advertencia: Pedido Express ${id} ya tiene driver asignado: ${order.driver}. No se permite reasignar.`);
            return res.status(400).json({
                msg: 'Este pedido Express ya ha sido aceptado por otro driver.',
            });
        }

        // Asigna el driver y actualiza el estado del pedido
        order.driver = driverId;
        order.estadoPedido = 'driver_asignado'; // O el estado apropiado para pedidos Express
        // Puedes agregar un campo fechaAceptacionDriver aquí si lo tienes en tu modelo Pedido
        
        await order.save();
        console.log(`✅ Pedido Express ${id} aceptado y asignado al driver ${driverId} con éxito.`);
        res.status(200).json({
            msg: 'Pedido Express aceptado con éxito.',
            order: order,
        });

    } catch (error) {
        console.log(`❌ Error al aceptar pedido Express ${id}: ${error.message}`);
        console.error('Error en acceptExpressOrder:', error);
        res.status(500).json({
            msg: 'Error interno del servidor al aceptar pedido Express.',
        });
    }
};

// --- Función para aceptar un Pedido de Paquetería ---
export const acceptPackageOrder = async (req, res) => {
    const { id } = req.params; // ID del pedido a aceptar
    const driverId = req.usuario._id; // Asume que el ID del driver viene del token JWT autenticado

    if (!driverId) {
        console.log(`Error: No se encontró el ID del driver en la solicitud para el pedido de Paquetería ${id}`);
        return res.status(401).json({
            msg: 'No autorizado: ID de driver no disponible.',
        });
    }

    try {
        console.log(`Intentando aceptar pedido de Paquetería con ID: ${id} para driver: ${driverId}`);
        const order = await EnvioPaquete.findById(id);

        if (!order) {
            console.log(`Error: Pedido de Paquetería con ID ${id} no encontrado.`);
            return res.status(404).json({
                msg: 'Pedido de Paquetería no encontrado.',
            });
        }

        // Verifica si el pedido ya tiene un driver asignado
        if (order.driverAsignado) {
            console.log(`Advertencia: Pedido de Paquetería ${id} ya tiene driver asignado: ${order.driverAsignado}. No se permite reasignar.`);
            return res.status(400).json({
                msg: 'Este pedido de Paquetería ya ha sido aceptado por otro driver.',
            });
        }

        // Asigna el driver y actualiza el estado del pedido
        order.driverAsignado = driverId;
        order.estadoPedido = 'driver_asignado'; // O el estado apropiado para pedidos de Paquetería
        // Puedes agregar un campo fechaAceptacionDriver aquí si lo tienes en tu modelo EnvioPaquete

        await order.save();
        console.log(`✅ Pedido de Paquetería ${id} aceptado y asignado al driver ${driverId} con éxito.`);
        res.status(200).json({
            msg: 'Pedido de Paquetería aceptado con éxito.',
            order: order,
        });

    } catch (error) {
        console.log(`❌ Error al aceptar pedido de Paquetería ${id}: ${error.message}`);
        console.error('Error en acceptPackageOrder:', error);
        res.status(500).json({
            msg: 'Error interno del servidor al aceptar pedido de Paquetería.',
        });
    }
};

export const getMyAssignedOrders = async (req, res) => {
    // El ID del driver se obtiene de req.usuario._id
    // Asume que req.usuario es establecido por un middleware de autenticación (ej. JWT)
    const driverId = req.usuario._id; 

    if (!driverId) {
        console.error(`❌ Error: No se encontró el ID del driver en la solicitud (req.usuario._id).`);
        return res.status(401).json({
            msg: 'No autorizado: ID de driver no disponible.',
        });
    }

    try {
        console.log(`🚀 Iniciando búsqueda de pedidos asignados para driver: ${driverId}`);
        let assignedOrders = [];

        // 1. Buscar Pedidos de App asignados (campo: driver, estadoPedido distinto de 'entregado')
        console.log(`🔍 Buscando Pedidos de App para driver: ${driverId} y estado != 'entregado'`);
        const appOrders = await PedidoApp.find({
            driver: driverId,
            estadoPedido: { $ne: 'entregado' } // <--- FILTRO AÑADIDO: estadoPedido no sea 'entregado'
        })
        .populate('userId', 'nombre telefono')
        .populate({
            path: 'storeDetails.storeId',
            select: 'nombre gps'
        })
        .select("numeroPedido subtotal porcentPago deliveryCost totalAmount notes orderItems orderDate deliveryAddress storeDetails paymentMethod estadoPedido estadoTienda createdAt");

        const mappedAppOrders = appOrders.map(order => ({
            id: order._id.toString(),
            tipoPedido: 'app',
            estadoPedido: order.estadoPedido,
            estadoTienda: order.estadoTienda,
            clientName: order.userId?.nombre || 'N/A',
            clientPhone: order.userId?.telefono || 'N/A',
            deliveryCost: order.deliveryCost || 0,
            medioDePago: order.paymentMethod || 'efectivo',
            totalAmount: order.totalAmount || 0,
            notes: order.notes || '',
            orderItems: order.orderItems?.map(item => ({
                productId: item.productId?.toString() || '',
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                totalItemPrice: item.totalItemPrice || 0,
                selectedOptions: item.selectedOptions || [],
            })) || [],
            orderDate: order.orderDate?.toISOString() || new Date(0).toISOString(),
            deliveryAddressDetails: {
                name: order.deliveryAddress?.name || null, 
                fullAddress: order.deliveryAddress?.fullAddress || '', 
                gps: order.deliveryAddress?.gps || '0,0',
                reference: order.deliveryAddress?.reference || null, 
            },
            storeDetails: {
                storeId: order.storeDetails?.storeId?._id?.toString() || null,
                nombre: order.storeDetails?.storeId?.nombre || 'Tienda Desconocida',
                gps: order.storeDetails?.storeId?.gps || null,
            },
            createdAt: order.createdAt?.toISOString() || new Date(0).toISOString(),
            numeroPedido: order.numeroPedido || null,
            subTotal: order.subtotal || 0, 
            porcentPago: order.porcentPago || 0,
            driver: order.driver?.toString(),
        }));
        assignedOrders = [...assignedOrders, ...mappedAppOrders];
        console.log(`✅ Se encontraron ${mappedAppOrders.length} pedidos de App asignados (no 'entregado').`);


        // 2. Buscar Pedidos Express asignados (campo: driver, estadoPedido distinto de 'entregado')
        console.log(`🔍 Buscando Pedidos Express para driver: ${driverId} y estado != 'entregado'`);
        const expressOrders = await Pedido.find({
            driver: driverId,
            estadoPedido: { $ne: 'entregado' } // <--- FILTRO AÑADIDO: estadoPedido no sea 'entregado'
        })
        .populate({ path: "generadoPor", select: "nombre" })
        .populate({ path: "local", select: "nombre gps direccion" })
        .select("cobrar comVenta porcentPago delivery direccion fecha hora local gps telefono detallePedido medioDePago estadoPedido createdAt generadoPor");

        const mappedExpressOrders = expressOrders.map(order => {
            const clientPhone = order.telefono || 'N/A';
            const deliveryCost = parseFloat(order.delivery || '0');
            const cobrar = parseFloat(order.cobrar || '0');
            const comVenta = parseFloat(order.comVenta || '0');
            const porcentPago = parseFloat(order.porcentPago || '0');
            const generadoPorNombre = order.generadoPor?.nombre || 'N/A';

            const orderDateISO = new Date(`${order.fecha}T${order.hora}:00.000Z`).toISOString();
            const storeDetails = {
                storeId: order.local?.[0]?._id?.toString() || null,
                nombre: order.local?.[0]?.nombre || 'Local desconocido',
                gps: order.local?.[0]?.gps || null,
                direccion: order.local?.[0]?.direccion || null, // Asegúrate de que el modelo Local tenga este campo
            };

            return {
                id: order._id.toString(),
                tipoPedido: 'express',
                estadoPedido: order.estadoPedido, 
                clientName: 'Cliente Express',
                clientPhone: clientPhone,
                deliveryCost: deliveryCost,
                medioDePago: order.medioDePago,
                detail: order.detallePedido || '',
                orderItems: [],
                orderDate: orderDateISO,
                deliveryAddressDetails: {
                    fullAddress: order.direccion || '',
                    gps: order.gps || '0,0',
                    name: null,
                    reference: null,
                },
                storeDetails: storeDetails,
                createdAt: order.createdAt?.toISOString() || new Date(0).toISOString(),
                cobrar: cobrar,
                comVenta: comVenta,
                porcentPago: porcentPago,
                generadoPorName: generadoPorNombre,
                driver: order.driver?.toString(),
            };
        });
        assignedOrders = [...assignedOrders, ...mappedExpressOrders];
        console.log(`✅ Se encontraron ${mappedExpressOrders.length} pedidos Express asignados (no 'entregado').`);


        // 3. Buscar Pedidos de Paquetería asignados (campo: driverAsignado, estadoPedido distinto de 'entregado')
        console.log(`🔍 Buscando Pedidos de Paquetería para driver: ${driverId} y estado != 'entregado'`);
        const packageOrders = await EnvioPaquete.find({
            driverAsignado: driverId,
            estadoPedido: { $ne: 'entregado' } // <--- FILTRO AÑADIDO: estadoPedido no sea 'entregado'
        }) 
        .populate('cliente', 'nombre telefono')
        .select("costoEnvio distanciaEnvioKm medioDePago quienPagaEnvio horaRecojoEstimada notasPedido recojo entrega fechaCreacion estadoPedido createdAt");

        const mappedPackageOrders = packageOrders.map(order => ({
            id: order._id.toString(),
            tipoPedido: 'paqueteria',
            estadoPedido: order.estadoPedido, 
            clientName: order.cliente?.nombre || 'N/A',
            clientPhone: order.cliente?.telefono || 'N/A',
            deliveryCost: order.costoEnvio || 0,
            distanceInKm: order.distanciaEnvioKm || 0,
            medioDePago: order.medioDePago || 'efectivo',
            porcentPago: order.porcentPago || 0.8,
            recojoDetails: {
                direccion: order.recojo?.direccion || '',
                referencia: order.recojo?.referencia || null,
                telefonoContacto: order.recojo?.telefonoContacto || null,
                detallesAdicionales: order.recojo?.detallesAdicionales || null,
                gps: (order.recojo?.gps?.latitude && order.recojo?.gps?.longitude)
                    ? `${order.recojo.gps.latitude},${order.recojo.gps.longitude}`
                    : '0,0',
            },
            deliveryAddressDetails: {
                fullAddress: order.entrega?.direccion || '',
                gps: (order.entrega?.gps?.latitude && order.entrega?.gps?.longitude)
                    ? `${order.entrega.gps.latitude},${order.entrega.gps.longitude}`
                    : '0,0',
                name: null,
                reference: order.entrega?.referencia || null,
                telefonoContacto: order.entrega?.telefonoContacto || null,
                detallesAdicionales: order.entrega?.detallesAdicionales || null,
            },
            notes: order.notasPedido || '', 
            orderDate: order.fechaCreacion?.toISOString() || new Date(0).toISOString(),
            horaRecojoEstimada: order.horaRecojoEstimada || null,
            createdAt: order.createdAt?.toISOString() || new Date(0).toISOString(),
            driverAsignado: order.driverAsignado?.toString(),
        }));
        assignedOrders = [...assignedOrders, ...mappedPackageOrders];
        console.log(`✅ Se encontraron ${mappedPackageOrders.length} pedidos de Paquetería asignados (no 'entregado').`);


        // --- Ordenamiento Final ---
        assignedOrders.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB.getTime() - dateA.getTime(); // Más recientes primero
        });

        console.log(`Total de pedidos asignados encontrados para driver ${driverId}: ${assignedOrders.length}`);
        console.log(`--- FIN DE BÚSQUEDA DE PEDIDOS ASIGNADOS ---`);

        res.status(200).json({
            msg: "Pedidos asignados encontrados.",
            pedidos: assignedOrders
        });

    } catch (error) {
        console.error(`❌ Error al obtener pedidos asignados para driver ${driverId}: ${error.message}`);
        console.error('Pila de errores:', error.stack); 
        res.status(500).json({
            msg: 'Error interno del servidor al obtener pedidos asignados.'
        });
    }
};

export const getDriverOrdersByDate = async (req, res) => {
    // El ID del driver se obtiene de req.usuario._id, establecido por un middleware de autenticación (ej. JWT)
    const driverId = req.usuario._id;
    const { date } = req.query; // La fecha se espera como un parámetro de consulta (ej: ?date=DD/MM/YYYY)

    if (!driverId) {
        console.error(`❌ Error: No se encontró el ID del driver en la solicitud (req.usuario._id).`);
        return res.status(401).json({
            msg: 'No autorizado: ID de driver no disponible.',
        });
    }

    if (!date) {
        console.error(`❌ Error: La fecha no fue proporcionada en la solicitud.`);
        return res.status(400).json({
            msg: 'La fecha es un parámetro requerido (formato DD/MM/YYYY).',
        });
    }

    // Parsear la fecha y establecer los límites del día en la zona horaria del servidor
    let startOfDay, endOfDay, selectedDateMoment;
    try {
        selectedDateMoment = moment.tz(date, 'DD/MM/YYYY', 'America/Lima'); // Asume zona horaria de Huaraz, Ancash, Perú
        if (!selectedDateMoment.isValid()) {
            throw new Error('Formato de fecha inválido. Use DD/MM/YYYY.');
        }
        startOfDay = selectedDateMoment.startOf('day').toDate();
        endOfDay = selectedDateMoment.endOf('day').toDate();
        console.log(`⏳ Buscando pedidos para el día: ${date} (desde ${startOfDay} hasta ${endOfDay})`);
    } catch (error) {
        console.error(`❌ Error al parsear la fecha ${date}: ${error.message}`);
        return res.status(400).json({
            msg: `Formato de fecha inválido. Use DD/MM/YYYY. Detalles: ${error.message}`,
        });
    }

    try {
        console.log(`🚀 Iniciando búsqueda de pedidos entregados para driver: ${driverId} en la fecha ${date}`);
        let completedOrders = [];

        // 1. Buscar Pedidos de App entregados
        // Campos solicitados: deliveryAddress.fullAddress, numeroPedido, deliveryCost, totalAmount, subtotal, orderDate, storeDetails.nombre, porcentPago
        // AHORA INCLUIMOS orderItems para calcular la comVenta
        console.log(`🔍 Buscando Pedidos de App entregados para driver: ${driverId} y fecha: ${date}`);
        const appOrders = await PedidoApp.find({
            driver: driverId,
            orderDate: { $gte: startOfDay, $lte: endOfDay }
        })
        .populate({
            path: 'storeDetails.storeId',
            select: 'nombre'
        })
        .select("deliveryAddress.fullAddress numeroPedido deliveryCost totalAmount subtotal orderDate porcentPago storeDetails.storeId orderItems"); // Seleccionar orderItems

        const mappedAppOrders = appOrders.map(order => {
            // Calcular comVenta como la suma de las cantidades de los productos
            const totalComVentaApp = order.orderItems ? 
                                     order.orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0) : 
                                     0;

            return {
                id: order._id.toString(),
                tipoPedido: 'app',
                numeroPedido: order.numeroPedido || null,
                orderDate: order.orderDate?.toISOString() || new Date(0).toISOString(),
                deliveryAddress: order.deliveryAddress?.fullAddress || '',
                deliveryCost: order.deliveryCost || 0,
                totalAmount: order.totalAmount || 0,
                subtotal: order.subtotal || 0,
                storeName: order.storeDetails?.storeId?.nombre || 'Tienda Desconocida',
                porcentPago: order.porcentPago || 0,
                comVenta: totalComVentaApp, // Asignar la suma de las cantidades como comVenta
            };
        });
        completedOrders = [...completedOrders, ...mappedAppOrders];
        console.log(`✅ Se encontraron ${mappedAppOrders.length} pedidos de App entregados.`);


        // 2. Buscar Pedidos Express entregados
        console.log(`🔍 Buscando Pedidos Express entregados para driver: ${driverId} y fecha: ${date}`);
        const expressOrders = await Pedido.find({
            driver: driverId,
            fecha: selectedDateMoment.format('YYYY-MM-DD')
        })
        .populate({ path: "local", select: "nombre" })
        .select("estadoPedido local hora fecha direccion telefono cobrar delivery comVenta porcentPago");

        const mappedExpressOrders = expressOrders.map(order => ({
            id: order._id.toString(),
            tipoPedido: 'express',
            estado: order.estadoPedido,
            storeName: order.local?.[0]?.nombre || 'Local desconocido',
            orderTime: order.hora || '',
            orderDate: order.fecha || '',
            deliveryAddress: order.direccion || '',
            clientPhone: order.telefono || 'N/A',
            cobrar: parseFloat(order.cobrar || '0'),
            deliveryCost: parseFloat(order.delivery || '0'),
            comVenta: parseFloat(order.comVenta || '0'), // Aquí comVenta sigue siendo el valor de la base de datos
            porcentPago: parseFloat(order.porcentPago || '0'),
        }));
        completedOrders = [...completedOrders, ...mappedExpressOrders];
        console.log(`✅ Se encontraron ${mappedExpressOrders.length} pedidos Express entregados.`);


        // 3. Buscar Pedidos de Paquetería entregados
        console.log(`🔍 Buscando Pedidos de Paquetería entregados para driver: ${driverId} y fecha: ${date}`);
        const packageOrders = await EnvioPaquete.find({
            driverAsignado: driverId,
            fechaCreacion: { $gte: startOfDay, $lte: endOfDay }
        })
        .select("costoEnvio recojo.direccion entrega.direccion horaRecojoEstimada porcentPago");

        const mappedPackageOrders = packageOrders.map(order => ({
            id: order._id.toString(),
            tipoPedido: 'paqueteria',
            costoEnvio: order.costoEnvio || 0,
            pickupAddress: order.recojo?.direccion || '',
            deliveryAddress: order.entrega?.direccion || '',
            estimatedPickupTime: order.horaRecojoEstimada || null,
            porcentPago: order.porcentPago || 0,
            comVenta: 0, // Para paquetería, comVenta es 0 o no aplica por defecto
        }));
        completedOrders = [...completedOrders, ...mappedPackageOrders];
        console.log(`✅ Se encontraron ${mappedPackageOrders.length} pedidos de Paquetería entregados.`);


        // --- Ordenamiento Final (opcional, pero buena práctica) ---
        completedOrders.sort((a, b) => {
            const dateA = a.orderDate ? new Date(a.orderDate) : new Date(0);
            const dateB = b.orderDate ? new Date(b.orderDate) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        console.log(`Total de pedidos entregados encontrados para driver ${driverId} en ${date}: ${completedOrders.length}`);
        console.log(`--- FIN DE BÚSQUEDA DE PEDIDOS ENTREGADOS ---`);

        res.status(200).json({
            msg: "Pedidos entregados para la fecha encontrados.",
            pedidos: completedOrders
        });

    } catch (error) {
        console.error(`❌ Error al obtener pedidos entregados para driver ${driverId} en la fecha ${date}: ${error.message}`);
        console.error('Pila de errores:', error.stack);
        res.status(500).json({
            msg: 'Error interno del servidor al obtener pedidos para la fecha.',
            error: error.message
        });
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
    obtenerPedidosNoEntregadosPorLocal,
    obtenerPedidosNoEntregadosSinDriver,
    obtenerPedidosAsignados,
    obtenerPedidoPorTelefono,
    calcularPrecioDelivery,
    obtenerLocalPorTelefono,
    calcularPrecioDeliveryDos
};
