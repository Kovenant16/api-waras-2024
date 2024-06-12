import Usuario from "../models/Usuario.js";
import generarId from "../helpers/generarId.js";
import generarJWT from "../helpers/generarJWT.js";
import { emailRegistro, emailOlvidePassword, emailRegistroMoto, emailOlvidePasswordMoto, emailRegistroSocio, emailOlvidePasswordSocio } from "../helpers/email.js";

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
            rol:usuario.rol,
            organizacion:usuario.organizacion
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
    if (usuario.rol !== "motorizado" ) {
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
            rol:usuario.rol
        });
    } else {
        const error = new Error("El password es incorrecto");
        return res.status(403).json({ msg: error.message });
    }
};

const autenticarUsuarioSocio = async (req, res) => {
    const { email, password } = req.body;

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ email }).populate({path:"organizacion", select: "direccion gps nombre telefonoUno"});
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
    if (usuario.rol !== "socio" ) {
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
            rol:usuario.rol,
            organizacion:usuario.organizacion
        });
    } else {
        const error = new Error("El password es incorrecto");
        return res.status(403).json({ msg: error.message });
    }
};

const autenticarUsuarioAtencion = async (req, res) => {
    const { email, password } = req.body;

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ email }).populate({path:"organizacion", select: "direccion gps nombre telefonoUno"});
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
    if (usuario.rol !== "atencion" ) {
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
            rol:usuario.rol,
            organizacion:usuario.organizacion
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

const toggleHabilitarUsuario = async(req, res) => {
    const {token } =req.params
    const usuario = await Usuario.findOne({ token });

    try {
        usuario.habilitado = !usuario.habilitado

    } catch (error) {
        console.log(error.message);
        
    }

}

const toggleActivarUsuario = async(req, res) => {
    const {token } =req.params
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


    
    const user = await Usuario.findOne({_id:usuario._id}).populate({path:"organizacion", select: "direccion gps nombre telefonoUno"}).select("email nombre organizacion rol telefono activo organizacion habilitado")
    res.json(user)
};

const obtenerUsuarioPorEmail = async(req, res) => {
    const {email} = req.body;

    const usuarios = await Usuario.findOne({email})

    res.json(usuarios)
}

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
    toggleActivarUsuario
};
