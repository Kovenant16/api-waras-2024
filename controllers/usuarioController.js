import Usuario from "../models/Usuario.js";
import generarId from "../helpers/generarId.js";
import generarJWT from "../helpers/generarJWT.js";
import { emailRegistro, emailOlvidePassword, emailRegistroMoto, emailOlvidePasswordMoto, emailRegistroSocio, emailOlvidePasswordSocio } from "../helpers/email.js";
import { sendMessageWithId } from "../bot/bot.js";
import moment from 'moment-timezone';

const registrarUsuario = async (req, res) => {
    //evitar registros duplicados
    const { email } = req.body;
    const existeUsuario = await Usuario.findOne({ email });

    if (existeUsuario) {
        const error = new Error("Usuario ya registrado con email");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const usuario = new Usuario(req.body);
        //le asignamos un token:
        usuario.token = generarId();
        await usuario.save();
        //enviar el email de confirmacion
        /*createSMS({
            email: usuario.email,
            nombre:usuario.nombre,
            token:usuario.token,
            telefono:usuario.telefono
        })
        */
        emailRegistro({
            email: usuario.email,
            nombre: usuario.nombre,
            token: usuario.token,
            telefono: usuario.telefono,
        });
        res.json({
            msg: "Usuario creado correctamente, te hemos enviado un email para que confirmes tu cuenta",
        });
    } catch (error) {
        console.log(error);
    }
};


const registrarUsuarioAdmin = async (req, res) => {
    //evitar registros duplicados
    const { email } = req.body;
    const existeUsuario = await Usuario.findOne({ email });

    if (existeUsuario) {
        const error = new Error("Usuario ya registrado con email");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const usuario = new Usuario(req.body);
        //le asignamos un token:
        usuario.token = generarId();
        usuario.rol = "administrador"
        await usuario.save();
        //enviar el email de confirmacion
        /*createSMS({
            email: usuario.email,
            nombre:usuario.nombre,
            token:usuario.token,
            telefono:usuario.telefono
        })
        */
        emailRegistro({
            email: usuario.email,
            nombre: usuario.nombre,
            token: usuario.token,
            telefono: usuario.telefono,
        });
        res.json({
            msg: "Usuario creado correctamente, te hemos enviado un email para que confirmes tu cuenta",
        });
    } catch (error) {
        console.log(error);
    }
};

const registrarUsuarioSocio = async (req, res) => {
    //evitar registros duplicados
    const { email } = req.body;
    const existeUsuario = await Usuario.findOne({ email });

    if (existeUsuario) {
        const error = new Error("Usuario ya registrado con email");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const usuario = new Usuario(req.body);
        //le asignamos un token:
        usuario.token = generarId();
        usuario.rol = "socio"
        await usuario.save();
        //enviar el email de confirmacion
        /*createSMS({
            email: usuario.email,
            nombre:usuario.nombre,
            token:usuario.token,
            telefono:usuario.telefono
        })
        */
        emailRegistroSocio({
            email: usuario.email,
            nombre: usuario.nombre,
            token: usuario.token,
            telefono: usuario.telefono,
        });
        res.json({
            msg: "Usuario creado correctamente, te hemos enviado un email para que confirmes tu cuenta",
        });
    } catch (error) {
        console.log(error);
    }
};

const registrarUsuarioAtencion = async (req, res) => {
    //evitar registros duplicados
    const { email } = req.body;
    const existeUsuario = await Usuario.findOne({ email });

    if (existeUsuario) {
        const error = new Error("Usuario ya registrado con email");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const usuario = new Usuario(req.body);
        //le asignamos un token:
        usuario.token = generarId();
        usuario.rol = "atencion"
        await usuario.save();
        emailRegistroSocio({
            email: usuario.email,
            nombre: usuario.nombre,
            token: usuario.token,
            telefono: usuario.telefono,
        });
        res.json({
            msg: "Usuario creado correctamente, te hemos enviado un email para que confirmes tu cuenta",
        });
    } catch (error) {
        console.log(error);
    }
};

const registrarUsuarioMoto = async (req, res) => {
    //evitar registros duplicados
    const { email } = req.body;
    const existeUsuario = await Usuario.findOne({ email });

    if (existeUsuario) {
        const error = new Error("Usuario ya registrado con email");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const usuario = new Usuario(req.body);
        //le asignamos un token:
        usuario.token = generarId();
        usuario.rol = "motorizado"
        await usuario.save();
        //enviar el email de confirmacion
        /*createSMS({
            email: usuario.email,
            nombre:usuario.nombre,
            token:usuario.token,
            telefono:usuario.telefono
        })
        */
        emailRegistroMoto({
            email: usuario.email,
            nombre: usuario.nombre,
            token: usuario.token,
            telefono: usuario.telefono,
        });
        res.json({
            msg: "Usuario creado correctamente, te hemos enviado un email para que confirmes tu cuenta",
        });
    } catch (error) {
        console.log(error);
    }
};

const autenticarUsuarioAdmin = async (req, res) => {
    const { email, password } = req.body;

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
        const error = new Error("El usuario no existe");
        return res.status(404).json({ msg: error.message });
    }

    //comprobar si el usuario esta confirmado
    if (!usuario.confirmado) {
        const error = new Error("Tu cuenta no ha sido confirmada");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar si el usuario esta habilitado
    if (!usuario.habilitado) {
        const error = new Error("Tu cuenta aun no ha sido habilitada");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar si el usuario es admin o soporte
    if (usuario.rol !== "administrador" && usuario.rol !== "soporte") {
        const error = new Error("No estas habilitado para esta plataforma");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar password
    if (await usuario.comprobarPassword(password)) {
        res.json({
            _id: usuario._id,
            nombre: usuario.nombre,
            email: usuario.email,
            token: generarJWT(usuario._id),
            rol: usuario.rol,
            organizacion: usuario.organizacion
        });
    } else {
        const error = new Error("El password es incorrecto");
        return res.status(403).json({ msg: error.message });
    }
};

const autenticarUsuarioMotorizado = async (req, res) => {
    const { email, password } = req.body;

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
        const error = new Error("El usuario no existe");
        return res.status(404).json({ msg: error.message });
    }

    //comprobar si el usuario esta confirmado
    if (!usuario.confirmado) {
        const error = new Error("Tu cuenta no ha sido confirmada");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar si el usuario esta habilitado
    if (!usuario.habilitado) {
        const error = new Error("Tu cuenta aun no ha sido habilitada");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar si el usuario es motorizado
    if (usuario.rol !== "motorizado") {
        const error = new Error("No estas habilitado para esta plataforma");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar password
    if (await usuario.comprobarPassword(password)) {
        res.json({
            _id: usuario._id,
            nombre: usuario.nombre,
            email: usuario.email,
            token: generarJWT(usuario._id),
            rol: usuario.rol,
            horaActivacion: usuario.horaActivacion,
            estadoUsuario: usuario.estadoUsuario
        });
    } else {
        const error = new Error("El password es incorrecto");
        return res.status(403).json({ msg: error.message });
    }
};

const autenticarUsuarioSocio = async (req, res) => {
    const { email, password } = req.body;

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ email }).populate({ path: "organizacion", select: "direccion gps nombre telefonoUno" });
    if (!usuario) {
        const error = new Error("El usuario no existe");
        return res.status(404).json({ msg: error.message });
    }

    //comprobar si el usuario esta confirmado
    if (!usuario.confirmado) {
        const error = new Error("Tu cuenta no ha sido confirmada");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar si el usuario esta habilitado
    if (!usuario.habilitado) {
        const error = new Error("Tu cuenta aun no ha sido habilitada");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar si el usuario es motorizado
    if (usuario.rol !== "socio") {
        const error = new Error("No estas habilitado para esta plataforma");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar password
    if (await usuario.comprobarPassword(password)) {
        res.json({
            _id: usuario._id,
            nombre: usuario.nombre,
            email: usuario.email,
            token: generarJWT(usuario._id),
            rol: usuario.rol,
            organizacion: usuario.organizacion
        });
    } else {
        const error = new Error("El password es incorrecto");
        return res.status(403).json({ msg: error.message });
    }
};

const autenticarUsuarioAtencion = async (req, res) => {
    const { email, password } = req.body;

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ email }).populate({ path: "organizacion", select: "direccion gps nombre telefonoUno" });
    if (!usuario) {
        const error = new Error("El usuario no existe");
        return res.status(404).json({ msg: error.message });
    }

    //comprobar si el usuario esta confirmado
    if (!usuario.confirmado) {
        const error = new Error("Tu cuenta no ha sido confirmada");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar si el usuario esta habilitado
    if (!usuario.habilitado) {
        const error = new Error("Tu cuenta aun no ha sido habilitada");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar si el usuario es motorizado
    if (usuario.rol !== "atencion") {
        const error = new Error("No estas habilitado para esta plataforma");
        return res.status(403).json({ msg: error.message });
    }

    //comprobar password
    if (await usuario.comprobarPassword(password)) {
        res.json({
            _id: usuario._id,
            nombre: usuario.nombre,
            email: usuario.email,
            token: generarJWT(usuario._id),
            rol: usuario.rol,
            organizacion: usuario.organizacion
        });
    } else {
        const error = new Error("El password es incorrecto");
        return res.status(403).json({ msg: error.message });
    }
};

const confirmarUsuario = async (req, res) => {
    const { token } = req.params;
    const usuarioConfirmar = await Usuario.findOne({ token });
    if (!usuarioConfirmar) {
        const error = new Error("Token no valido");
        return res.status(403).json({ msg: error.message });
    }
    try {
        usuarioConfirmar.token = "";
        usuarioConfirmar.confirmado = true;
        await usuarioConfirmar.save();
        res.json({ msg: "Usuario confirmado correctamente" });
    } catch (error) {
        console.log(error);
    }
};

const editarUsuario2 = async (req, res) => {
    const { id } = req.params;  // Obtener el id del usuario a editar
    const { nombre, email, telefono, yape, plin, urlPerfil, organizacion, whatsapp, rol, habilitado, estadoUsuario } = req.body;  // Obtener los datos del cuerpo de la petición

    try {
        // Buscar el usuario por su ID
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            const error = new Error("Usuario no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        // Actualizar los campos del usuario si se proporcionaron
        usuario.nombre = nombre || usuario.nombre;
        usuario.email = email || usuario.email;
        usuario.telefono = telefono || usuario.telefono;
        usuario.yape = yape || usuario.yape;
        usuario.plin = plin || usuario.plin;
        usuario.organizacion = organizacion || usuario.organizacion;
        usuario.whatsapp = whatsapp || usuario.whatsapp;
        usuario.rol = rol || usuario.rol;
        usuario.habilitado = habilitado !== undefined ? habilitado : usuario.habilitado;
        usuario.estadoUsuario = estadoUsuario || usuario.estadoUsuario;

        // Guardar los cambios
        await usuario.save();
        console.log(usuario);


        res.json({ msg: "Usuario actualizado correctamente", usuario });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Hubo un error al actualizar el usuario" });
    }
};

const editarUsuario = async (req, res) => {
    const { id } = req.params;  // Obtener el id del usuario a editar
    const { nombre, email, telefono, yape, plin, urlPerfil, organizacion, whatsapp, rol, habilitado, estadoUsuario } = req.body;  // Obtener los datos del cuerpo de la petición

    try {
        // Buscar el usuario por su ID
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            const error = new Error("Usuario no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        // Actualizar los campos del usuario si se proporcionaron
        usuario.nombre = nombre || usuario.nombre;
        usuario.email = email || usuario.email;
        usuario.telefono = telefono || usuario.telefono;
        usuario.yape = yape || usuario.yape;
        usuario.plin = plin || usuario.plin;
        usuario.organizacion = organizacion !== undefined ? organizacion : usuario.organizacion; // Verificación explícita para organización
        usuario.whatsapp = whatsapp || usuario.whatsapp;
        usuario.rol = rol || usuario.rol;
        usuario.habilitado = habilitado !== undefined ? habilitado : usuario.habilitado;
        usuario.estadoUsuario = estadoUsuario || usuario.estadoUsuario;

        // Guardar los cambios
        await usuario.save();
        console.log(usuario);


        res.json({ msg: "Usuario actualizado correctamente", usuario });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Hubo un error al actualizar el usuario" });
    }
};

const olvidePassword = async (req, res) => {
    const { email } = req.body;

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
        const error = new Error("El usuario no existe");
        return res.status(404).json({ msg: error.message });
    }

    try {
        usuario.token = generarId();
        await usuario.save();
        //enviar el email
        emailOlvidePassword({
            email: usuario.email,
            nombre: usuario.nombre,
            token: usuario.token,
            telefono: usuario.telefono,
        })
        res.json({ msg: "Te hemos enviado un email con las instrucciones, revisa tu correo" });
    } catch (error) {
        console.log(error);
    }
};
const olvidePasswordMoto = async (req, res) => {
    const { email } = req.body;

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
        const error = new Error("El usuario no existe");
        return res.status(404).json({ msg: error.message });
    }

    try {
        usuario.token = generarId();
        await usuario.save();
        //enviar el email
        emailOlvidePasswordMoto({
            email: usuario.email,
            nombre: usuario.nombre,
            token: usuario.token,
            telefono: usuario.telefono,
        })
        res.json({ msg: "Te hemos enviado un email con las instrucciones, revisa tu correo" });
    } catch (error) {
        console.log(error);
    }
};

const olvidePasswordSocio = async (req, res) => {
    const { email } = req.body;

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
        const error = new Error("El usuario no existe");
        return res.status(404).json({ msg: error.message });
    }

    try {
        usuario.token = generarId();
        await usuario.save();
        //enviar el email
        emailOlvidePasswordSocio({
            email: usuario.email,
            nombre: usuario.nombre,
            token: usuario.token,
            telefono: usuario.telefono,
        })
        res.json({ msg: "Te hemos enviado un email con las instrucciones, revisa tu correo" });
    } catch (error) {
        console.log(error);
    }
};

const comprobarToken = async (req, res) => {
    const { token } = req.params;
    const tokenValido = await Usuario.findOne({ token });

    if (tokenValido) {
        res.json({ msg: "Token valido y usuario existe" });
    } else {
        const error = new Error("Token no valido");
        return res.status(404).json({ msg: error.message });
    }
};

const nuevoPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    const usuario = await Usuario.findOne({ token });

    if (usuario) {
        usuario.password = password;
        usuario.token = "";
        try {
            await usuario.save();
            res.json({ msg: "Password modificado correctamente" });
        } catch (error) {
            console.log(error);
        }
    } else {
        const error = new Error("Token no valido");
        return res.status(404).json({ msg: error.message });
    }
};

const desactivarUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            const error = new Error("Usuario no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        usuario.activo = false;
        usuario.estadoUsuario = "Inactivo"
        await usuario.save();

        // Obtener motorizados activos y enviar mensaje de Telegram
        await obtenerMotorizadosActivosYEnviarMensaje();

        res.json({ msg: "Usuario desactivado correctamente" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al desactivar el usuario" });
    }
};

const desactivarUsuarioPorAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            const error = new Error("Usuario no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        usuario.activo = false;
        usuario.estadoUsuario = "Inactivo"
        await usuario.save();

        const nombreEnNegritasYMayusculas = `${usuario.nombre.toUpperCase()}`;

        const mensaje = `🚫 *${nombreEnNegritasYMayusculas}* ha sido desactivado por el sistema.\n\n` +
                        `Razón: _Inactividad_\n\n` +
                        `Recuerda activarte unicamente cuando estés disponible`;

        // Obtener motorizados activos y enviar mensaje de Telegram
        //await obtenerMotorizadosActivosYEnviarMensaje();
        await sendMessageWithId("-1002562943564", mensaje);
        //await sendMessageWithId("-4241205369", mensaje);

        res.json({ msg: "Usuario desactivado correctamente" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al desactivar el usuario" });
    }
};

const activarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            const error = new Error("Usuario no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        usuario.activo = true;
        usuario.horaActivacion = new Date(); // Registra la hora actual
        usuario.estadoUsuario = "Libre";
        await usuario.save();

        // Obtener motorizados activos y enviar mensaje de Telegram
        await obtenerMotorizadosActivosYEnviarMensaje();

        res.json({ msg: "Usuario activado correctamente" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al activar el usuario" });
    }
};

export const activarDriver = async (req, res) => {
    const  id  = req.usuario._id;

    try {
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            const error = new Error("Usuario no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        usuario.activo = true;
        usuario.horaActivacion = new Date(); // Registra la hora actual
        usuario.estadoUsuario = "Libre";
        await usuario.save();

        // Obtener motorizados activos y enviar mensaje de Telegram
        await obtenerMotorizadosActivosYEnviarMensaje();

        res.json({ msg: "Usuario activado correctamente" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al activar el usuario" });
    }
};

export const desactivarDriver = async (req, res) => {
    const  id  = req.usuario._id;
    try {
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            const error = new Error("Usuario no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        usuario.activo = false;
        usuario.estadoUsuario = "Inactivo"
        await usuario.save();

        // Obtener motorizados activos y enviar mensaje de Telegram
        await obtenerMotorizadosActivosYEnviarMensaje();

        res.json({ msg: "Usuario desactivado correctamente" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al desactivar el usuario" });
    }
};

const liberarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            const error = new Error("Usuario no encontrado");
            return res.status(404).json({ msg: error.message });
        }

        usuario.activo = true;
        usuario.horaActivacion = new Date(); // Registra la hora actual
        usuario.estadoUsuario = "Libre";
        await usuario.save();

        // Obtener motorizados activos y enviar mensaje de Telegram
        await obtenerMotorizadosLibreYEnviarMensaje(id);

        res.json({ msg: "Usuario activado correctamente" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error al activar el usuario" });
    }
};

const obtenerMotorizadosLibreYEnviarMensaje = async (id) => {
    try {
        const motorizado = await Usuario.findById(id)
            .select("nombre horaActivacion telefono") // Selecciona solo los campos necesarios
            .sort({ horaActivacion: 1 }); // Ordena por horaActivacion, el más antiguo primero

        // Crear el mensaje de Telegram con la lista de motorizados activos


        let mensaje = ` ${motorizado.nombre} - Esta libre`;


        // Enviar mensaje a Telegram
        await sendMessageWithId("-1002562943564", mensaje); // Reemplaza "-1002562943564" con el chat_id adecuado
    } catch (error) {
        console.log("Error al obtener los motorizados activos o enviar el mensaje de Telegram:", error);
    }
};

export const obtenerMotorizadosActivosYEnviarMensaje = async () => {
    try {
        const motorizados = await Usuario.find({
            rol: "motorizado",
            habilitado: true,
            activo: true
        })
            .select("nombre horaActivacion estadoUsuario") // Selecciona solo los campos necesarios
            .sort({ horaActivacion: 1 }); // Ordena por horaActivacion, el más antiguo primero

        // Crear el mensaje de Telegram con la lista de motorizados activos
        let mensaje = "📋 Lista de motorizados activos:\n\n";
        motorizados.forEach((motorizado, index) => {
            // Se asume que el campo 'nombre' tiene el formato 'Nombre Apellido'
            const [primerNombre, apellido] = motorizado.nombre.split(" ");  // Divide el nombre completo
            const apellidoAbreviado = apellido ? apellido.slice(0, 3) : '';  // Toma las primeras 3 letras del apellido

            mensaje += `${index + 1}. ${primerNombre} ${apellidoAbreviado}. - EE: ${motorizado.estadoUsuario}\n`;
        });

        // Enviar mensaje a Telegram
        await sendMessageWithId("-1002562943564", mensaje); // Reemplaza "-1002562943564" con el chat_id adecuado grupo
    } catch (error) {
        console.log("Error al obtener los motorizados activos o enviar el mensaje de Telegram:", error);
    }
};

export const enviarMotorizadosActivosAlUsuario = async (ctx) => {
    try {
        const motorizados = await Usuario.find({
            rol: "motorizado",
            habilitado: true,
            activo: true
        })
            .select("nombre horaActivacion estadoUsuario")
            .sort({ horaActivacion: 1 });

        // Crea el mensaje de Telegram con la lista de motorizados activos
        let mensaje = "📋 Lista de motorizados activos:\n\n";
        motorizados.forEach((motorizado, index) => {
            const [primerNombre, apellido] = motorizado.nombre.split(" ");
            const apellidoAbreviado = apellido ? apellido.slice(0, 3) : '';

            mensaje += `${index + 1}. ${primerNombre} ${apellidoAbreviado}. - EE: ${motorizado.estadoUsuario}\n`;
        });

        // Usa ctx.reply para responder directamente al usuario que envió el comando
        await ctx.reply(mensaje);

    } catch (error) {
        console.log("Error al obtener los motorizados activos o enviar el mensaje de Telegram:", error);
        // También puedes enviar un mensaje de error al usuario
        ctx.reply("Hubo un error al intentar obtener la lista de motorizados. Por favor, inténtalo de nuevo más tarde.");
    }
};


const toggleActivarUsuario = async (req, res) => {
    const { token } = req.params
    const usuario = await Usuario.findOne({ token });

    try {
        usuario.activo = !usuario.activo

    } catch (error) {
        console.log(error.message);

    }

}

const perfil = async (req, res) => {
    const { usuario } = req;

    //const user = Usuario.findOne({id:usuario._id})



    const user = await Usuario.findOne({ _id: usuario._id }).populate({ path: "organizacion", select: "direccion gps nombre telefonoUno" }).select("email nombre organizacion rol telefono activo organizacion habilitado estadoUsuario horaActivacion")
    res.json(user)
};

const obtenerEstados = async (req, res) => {
    const { usuario } = req;

    // Consulta que solo trae los campos especificados
    const user = await Usuario.findOne({ _id: usuario._id }).select("email nombre estadoUsuario horaActivacion");

    res.json(user);
};

const obtenerUsuarioPorEmail = async (req, res) => {
    const { email } = req.body;

    const usuarios = await Usuario.findOne({ email }).select("-createdAt -horaActivacion -password -token -__v").populate("organizacion", "nombre idTelegram")

    res.json(usuarios)
}

const obtenerUltimosUsuarios = async (req, res) => {
    try {
        // Obtener los últimos 5 usuarios ordenados por la fecha de creación
        const usuarios = await Usuario.find({})
            .select("nombre email")
            .sort({ createdAt: -1 }) // Ordenar por fecha de creación en orden descendente
            .limit(5); // Limitar a los 5 más recientes

        res.json(usuarios);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Hubo un error al obtener los usuarios" });
    }
};

const registrarFcmToken = async (req, res) => {
    const { userId } = req.params; // O de req.user._id si está autenticado
    const { fcmToken, deviceId, platform } = req.body; // Ahora esperamos más datos

    if (!fcmToken || !deviceId || !platform) {
        const error = new Error("El token FCM, deviceId y platform son requeridos.");
        return res.status(400).json({ msg: error.message });
    }

    try {
        const usuario = await Usuario.findById(userId);

        if (!usuario) {
            const error = new Error("Usuario no encontrado.");
            return res.status(404).json({ msg: error.message });
        }

        // Asegúrate de que fcmTokens sea un arreglo
        if (!usuario.fcmTokens || !Array.isArray(usuario.fcmTokens)) {
            usuario.fcmTokens = [];
        }

        // Buscar si ya existe un token para este deviceId o si el mismo fcmToken ya está registrado
        // Se prefiere buscar por deviceId para actualizar el token si el dispositivo es el mismo
        let existingTokenIndex = usuario.fcmTokens.findIndex(
            t => t.deviceId === deviceId
        );

        if (existingTokenIndex !== -1) {
            // Si encontramos un token para este deviceId, actualizamos su información
            usuario.fcmTokens[existingTokenIndex].token = fcmToken;
            usuario.fcmTokens[existingTokenIndex].platform = platform;
            usuario.fcmTokens[existingTokenIndex].lastRegisteredAt = new Date();
            console.log(`Token FCM actualizado para deviceId: ${deviceId}`);
        } else {
            // Si no encontramos un token para este deviceId, añadimos uno nuevo
            usuario.fcmTokens.push({
                token: fcmToken,
                deviceId: deviceId,
                platform: platform,
                lastRegisteredAt: new Date(),
            });
            console.log(`Nuevo Token FCM añadido para deviceId: ${deviceId}`);
        }

        await usuario.save();
        res.json({ msg: "Token FCM registrado/actualizado correctamente." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Hubo un error al registrar el token FCM." });
    }
};



export {
    registrarUsuario,
    autenticarUsuarioAdmin,
    registrarUsuarioAdmin,
    registrarUsuarioSocio,
    registrarUsuarioMoto,
    registrarUsuarioAtencion,
    autenticarUsuarioMotorizado,
    autenticarUsuarioSocio,
    autenticarUsuarioAtencion,
    confirmarUsuario,
    olvidePassword,
    olvidePasswordMoto,
    olvidePasswordSocio,
    comprobarToken,
    nuevoPassword,
    perfil,
    obtenerUsuarioPorEmail,
    toggleActivarUsuario,
    desactivarUsuario,
    activarUsuario,
    obtenerEstados,
    liberarUsuario,
    editarUsuario,
    obtenerUltimosUsuarios,
    desactivarUsuarioPorAdmin,
    registrarFcmToken
};
