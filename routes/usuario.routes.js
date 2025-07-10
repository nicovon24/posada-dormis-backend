import { Router } from "express";
import {
	getAllUsuarios,
	deleteUsuario,
} from "../controllers/usuario.controller.js";
import { auditLogger } from "../middlewares/auditLogger.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";

// Constantes para acciones de auditoría
const LIST_USUARIOS = "LIST_USUARIOS";
const DELETE_USUARIO = "DELETE_USUARIO";

const router = Router();

// Aseguramos que req.user esté poblado antes de auditar
router.use(verifyJWT);

// Listar usuarios → registra auditoría LIST_USUARIOS
router.get("/", auditLogger(LIST_USUARIOS), getAllUsuarios);

// Eliminar usuario → registra auditoría DELETE_USUARIO
router.delete("/:id", auditLogger(DELETE_USUARIO), deleteUsuario);

export default router;
