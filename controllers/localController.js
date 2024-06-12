import Local from "../models/Local.js";


const agregarLocal = async (req, res) =>{
    

    try {
        const local = new Local(req.body);
        const localAlmacenado = await local.save()

        res.json(localAlmacenado)
        
    } catch (error) {
        console.log(error);
        
    }
}

const editarLocal = async (req, res) => {
    const { id } = req.params;

    const local = await Local.findById(id);

    if (!local) {
        const error = new Error("Local no encontrado");
        return res.status(404).json({ msg: error.message });
    }

    

    local.nombre = req.body.nombre || local.nombre;
    local.direccion = req.body.direccion || local.direccion;
    local.gps = req.body.gps || local.gps;
    local.telefonoUno = req.body.telefonoUno || local.telefonoUno;
    local.telefonoDos = req.body.telefonoDos || local.telefonoDos;
    local.urlLogo = req.body.urlLogo || local.urlLogo;    
    local.habilitado = req.body.habilitado || local.habilitado;
    local.tienda = req.body.tienda|| local.tienda;
    local.ruta = req.body.ruta || local.ruta;
    local.urlBanner = req.body.urlBanner || local.urlBanner;
    local.horario = req.body.horario || local.horario;
    local.ubicacion = req.body.ubicacion || local.ubicacion;
    local.tiempoPreparacion = req.body.tiempoPreparacion || local.tiempoPreparacion;    
    local.diasAbiertos = req.body.diasAbiertos || local.diasAbiertos;
    local.horaInicioFin = req.body.horaInicioFin || local.horaInicioFin;
    local.adicionalPorTaper = req.body.adicionalPorTaper || local.adicionalPorTaper;
    local.tags = req.body.tags || local.tags;

    try {
        const localAlmacenado = await local.save();
        res.json(localAlmacenado);
    } catch (error) {
        console.log(error);
    }
};

const toggleTiendaLocal = async (req, res) => {
    const {id} = req.params;
    console.log(id);

    try {
        const local = await Local.findById(id);
        
        if(!local) {
            const error = new Error("local no encontrado")
            return res.status(404).json({msg: error.message})
        }

        local.tienda = !local.tienda;
        const localCambiado = await local.save();
        res.json(localCambiado)
    } catch (error) {
        console.log(error);
        res.status(500).json({msg: "Error del servidor"})
    }
}

const eliminarLocal = async (req, res) => {
    const {id} = req.params;

    const local = await Local.findById(id);

    if(!local) {
        const error  = new Error ("local no encontrado")
        return res.status(404).json({msg: error.message});
    }

    if (req.usuario.rol === "Administrador" || req.usuario.rol === "Soporte") {
        const error = new Error("No permitido");
        return res.status(404).json({ msg: error.message });
    }

    try {
        await local.deleteOne();
        res.json({msg: "Local eliminado"})
    } catch (error) {
        console.log(error);
    }
}





export {agregarLocal, editarLocal,toggleTiendaLocal, eliminarLocal}