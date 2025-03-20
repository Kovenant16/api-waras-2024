import Asistencia from '../models/Asistencia.js';

export const obtenerAsistencias = async (req, res) => {
  try {
    const { usuarioId, fecha } = req.query;

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);

    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const asistencias = await Asistencia.find({
      usuarioId,
      fecha: {
        $gte: fechaInicio,
        $lte: fechaFin
      }
    });

    res.json(asistencias);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const obtenerAsistencia = async (req, res) => {
  try {
    const asistencia = await Asistencia.findById(req.params.id);
    if (!asistencia) {
      return res.status(404).json({ mensaje: 'Asistencia no encontrada' });
    }
    res.json(asistencia);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const crearAsistencia = async (req, res) => {
  try {
    const usuarioId = req.usuario._id; // Obtener el ID del usuario autenticado desde el token

    if (!usuarioId) {
      return res.status(401).json({ mensaje: "Usuario no autenticado." });
    }

    // Crear una nueva asistencia con el usuario autenticado
    const asistencia = new Asistencia({
      user: usuarioId, // Asociar la asistencia con el usuario autenticado
      records: [
        {
          checkIn: new Date(), // Registrar la hora de entrada
        },
      ],
    });

    const asistenciaGuardada = await asistencia.save();
    res.status(201).json(asistenciaGuardada);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

export const registrarSalida2 = async (req, res) => {
  console.log("registrar salida ");
  
  try {
    // Obtenemos el ID del usuario desde el middleware `checkAuth`
    const usuarioId = req.usuario._id;

    // Obtenemos la fecha actual (inicio del día) para buscar el registro del día correspondiente
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    // Buscar el registro de asistencia del usuario para el día actual
    const asistencia = await Asistencia.findOne({
      user: usuarioId,
      date: { $gte: inicioDia }
    });

    if (!asistencia) {
      return res.status(404).json({ mensaje: "No se encontró un registro de asistencia para el día actual." });
    }

    // Verificar si ya hay un registro de salida en el último registro
    const ultimoRegistro = asistencia.records[asistencia.records.length - 1];
    if (ultimoRegistro.checkOut) {
      return res.status(400).json({ mensaje: "Ya se ha registrado la salida para este turno." });
    }

    // Registrar la salida en el último registro
    ultimoRegistro.checkOut = new Date();

    // Guardar los cambios
    await asistencia.save();

    res.json({ mensaje: "Salida registrada correctamente.", asistencia });
  } catch (error) {
    console.error("Error al registrar la salida:", error.message);
    res.status(500).json({ mensaje: "Error al registrar la salida." });
  }
};

export const registrarSalida = async (req, res) => {
  console.log("registrar salida");
  
    const { id, recordIndex } = req.params;
    console.log(req.params);
    

    console.log("asistenciaId:", id);
    console.log("recordId:", recordIndex);
    
    const salidaTime = new Date();

    try {
        const asistencia = await Asistencia.findOneAndUpdate(
            { _id: id, "records._id": recordIndex },
            { $set: { "records.$.checkOut": salidaTime } },
            { new: true }
        );

        if (!asistencia) {
            return res.status(404).json({ error: "Asistencia o registro no encontrado." });
        }

        res.status(200).json(asistencia);
    } catch (error) {
        console.error("Error al registrar la salida:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};


export const agregarNuevoRegistro = async (req, res) => {
  try {
    const { id } = req.params;

    const asistencia = await Asistencia.findById(id);
    if (!asistencia) {
      return res.status(404).json({ mensaje: 'Asistencia no encontrada' });
    }

    asistencia.records.push({
      entrada: new Date()
    });

    const asistenciaActualizada = await asistencia.save();
    res.json(asistenciaActualizada);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const eliminarAsistencia = async (req, res) => {
  try {
    const asistencia = await Asistencia.findByIdAndDelete(req.params.id);
    if (!asistencia) {
      return res.status(404).json({ mensaje: 'Asistencia no encontrada' });
    }
    res.json({ mensaje: 'Asistencia eliminada correctamente' });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const obtenerAsistenciasPorFecha = async (req, res) => {
  const { fechaSeleccionada } = req.body; // Fecha en formato "YYYY-MM-DD"

  console.log("Fecha seleccionada:", fechaSeleccionada);

  if (!fechaSeleccionada || isNaN(new Date(fechaSeleccionada).getTime())) {
      return res.status(400).json({ mensaje: "Fecha no válida" });
  }

  try {
      // Convertir la fecha seleccionada a una instancia de Date sin hora
      const fechaBase = new Date(`${fechaSeleccionada}T00:00:00.000Z`);

      // Ajustar a UTC restando 5 horas (para convertir GMT-5 a UTC)
      const offsetGMT5 = 5 * 60 * 60 * 1000; // 5 horas en milisegundos
      const startOfDayUTC = new Date(fechaBase.getTime() + offsetGMT5);
      const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

      console.log("Rango de búsqueda UTC:", startOfDayUTC, endOfDayUTC);

      // Consulta en la base de datos usando el rango UTC ajustado
      const asistencias = await Asistencia.find({
          "records.checkIn": { $gte: startOfDayUTC, $lte: endOfDayUTC },
      }).populate("user", "nombre telefono");

      if (asistencias.length === 0) {
          return res
              .status(404)
              .json({ mensaje: "No se encontraron asistencias para esa fecha." });
      }

      return res.status(200).json(asistencias);
  } catch (error) {
      console.error("Error al obtener las asistencias:", error);
      return res.status(500).json({ mensaje: "Hubo un error al obtener las asistencias." });
  }
};




