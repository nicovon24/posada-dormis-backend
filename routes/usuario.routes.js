import { Router } from "express";
import {
	getAllUsuarios,
	deleteUsuario,
} from "../controllers/usuario.controller.js";
import { auditLogger } from "../middlewares/auditLogger.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";
import { DELETE_USUARIO } from "../constants/index.js";

const router = Router();

// Aseguramos que req.user esté poblado antes de auditar
router.use(verifyJWT);

router.get("/", getAllUsuarios);

// Eliminar usuario → registra auditoría DELETE_USUARIO
router.delete("/:id", auditLogger(DELETE_USUARIO), deleteUsuario);

export default router;
