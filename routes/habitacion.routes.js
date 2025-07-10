// src/routes/habitacion.routes.js
import { Router } from "express";
import {
	getAllHabitaciones,
	getHabitacionById,
	createHabitacion,
	updateHabitacion,
	deleteHabitacion,
} from "../controllers/index.js";
import { auditLogger } from "../middlewares/auditLogger.js";

const router = Router();

router.get("/", getAllHabitaciones);
router.get("/:id", getHabitacionById);

// Crear habitación
router.post("/", auditLogger("CREATE_ROOM"), createHabitacion);

// Actualizar habitación →
router.put("/:id", auditLogger("UPDATE_ROOM"), updateHabitacion);

// Eliminar habitación
router.delete("/:id", auditLogger("DELETE_ROOM"), deleteHabitacion);

export default router;
