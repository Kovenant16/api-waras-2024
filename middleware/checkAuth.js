import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

const checkAuth = async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Busca el usuario por ID y selecciona los campos necesarios.
            // Asegúrate de incluir 'habilitado' en la selección o que no esté excluido,
            // ya que lo necesitarás para la verificación.
            req.usuario = await Usuario.findById(decoded.id).select(
                " -password -confirmado -telefono -whatsapp -createdAt -updatedAt -__v -token" // Asegúrate de NO excluir 'habilitado' si lo excluyes en otro lado
            ).populate("organizacion");

            // --- ¡NUEVA LÓGICA AQUÍ! ---
            if (!req.usuario) {
                // Esto podría ocurrir si el ID en el token es válido pero el usuario fue borrado
                return res.status(404).json({ msg: "Usuario no encontrado." });
            }

            if (!req.usuario.habilitado) {
                // Si el usuario no está habilitado, devuelve 403 Forbidden o 401 Unauthorized
                return res.status(403).json({ msg: "Tu cuenta no está habilitada. Contacta al administrador." });
                // Podrías usar 401 si quieres que parezca que el token es inválido o el acceso está denegado por completo.
                // 403 es más específico: el usuario está autenticado, pero no autorizado a proceder.
            }
            // --- FIN NUEVA LÓGICA ---

            return next();
        } catch (error) {
            // console.error("Error en checkAuth:", error); // Descomentar para depuración
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ msg: "Token inválido." });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ msg: "Token expirado." });
            }
            // Catch-all para otros errores como problemas de conexión a DB, etc.
            return res.status(500).json({ msg: "Hubo un error de autenticación. Inténtalo de nuevo más tarde." });
        }
    }

    if (!token) {
        return res.status(401).json({ msg: "Token no proporcionado o formato inválido." });
    }
    // El `next()` final es redundante y se puede eliminar como mencioné antes.
    // next();
};

export default checkAuth;