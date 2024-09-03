import express from "express";
const router = express.Router();

import {
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
} from "../controllers/usuarioController.js";

import checkAuth from "../middleware/checkAuth.js";

//auth, registro y confirmacion de usuarios

router.post("/", registrarUsuario)
router.put("/toggleActivarUsuario", toggleActivarUsuario);
router.put("/activarUsuario/:id", activarUsuario);
router.put("/liberarUsuario/:id", liberarUsuario);
router.put("/desactivarUsuario/:id", desactivarUsuario);
router.post("/registrarAdmin", registrarUsuarioAdmin);
router.post("/registrarSocio", registrarUsuarioSocio);
router.post("/registrarMoto", registrarUsuarioMoto);
router.post("/registrarAtencion", registrarUsuarioAtencion);
router.post("/loginMoto", autenticarUsuarioMotorizado)
router.post("/login", autenticarUsuarioAdmin);
router.post("/loginSocio", autenticarUsuarioSocio);
router.post("/loginAtencion", autenticarUsuarioAtencion);
router.get("/confirmar/:token", confirmarUsuario);
router.post("/olvide-password", olvidePassword);
router.post("/olvide-password-moto", olvidePasswordMoto);
router.post("/olvide-password-socio", olvidePasswordSocio);
router.get("/olvide-password/:token", comprobarToken);
router.post("/olvide-password/:token", nuevoPassword);
router.post("/buscarUsuarioPorEmail", obtenerUsuarioPorEmail)
router.get("/perfil", checkAuth, perfil);
router.get("/obtenerEstados", checkAuth, obtenerEstados);

export default router;
