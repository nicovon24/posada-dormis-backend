import { Router } from "express";
import {
	getAllUsuarios,
	deleteUsuario,
} from "../controllers/usuario.controller.js";
import { inviteUsuario } from "../controllers/usuarioInvite.controller.js";
import { auditLogger } from "../middlewares/auditLogger.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";
import { authorize } from "../middlewares/authorize.js";
import { DELETE_USUARIO } from "../constants/index.js";

const router = Router();

// Aseguramos que req.user esté poblado antes de auditar
router.use(verifyJWT);

router.get("/", authorize("usuario", "read"), getAllUsuarios);

// Invitar usuario (crea o regenera token y envía mail)
router.post("/invite", authorize("usuario", "create"), inviteUsuario);

// Eliminar usuario → registra auditoría DELETE_USUARIO
router.delete("/:id", authorize("usuario", "delete"), auditLogger(DELETE_USUARIO), deleteUsuario);

export default router;
