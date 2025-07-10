import { Router } from "express";
import {
	getAllReservas,
	getReservasCalendar,
	createReserva,
	updateReserva,
	deleteReserva,
} from "../controllers/index.js";
import { auditLogger } from "../middlewares/auditLogger.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";

const router = Router();

// Poblamos req.user antes de auditar
router.use(verifyJWT);

// Listar reservas
router.get("/", auditLogger("listar reservas"), getAllReservas);

// Calendario de días completamente ocupados
router.get(
	"/calendar",
	auditLogger("ver calendario reservas"),
	getReservasCalendar
);

// Crear reserva
router.post("/", auditLogger("CREATE_RESERVATION"), createReserva);

// Actualizar reserva
router.put("/:id", auditLogger("UPDATE_RESERVATION"), updateReserva);

// Eliminar reserva
router.delete("/:id", auditLogger("DELETE_RESERVATION"), deleteReserva);

export default router;
