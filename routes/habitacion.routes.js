// src/routes/habitacion.routes.js
import { Router } from "express";
import {
	getAllHabitaciones,
	createHabitacion,
	updateHabitacion,
	deleteHabitacion,
	getHabitacionesDisponiblesPorDia,
} from "../controllers/index.js";
import { auditLogger } from "../middlewares/auditLogger.js";
import { CREATE_ROOM, DELETE_ROOM, UPDATE_ROOM } from "../constants/index.js";

const router = Router();

router.get("/", getAllHabitaciones);

// Crear habitación
router.post("/", auditLogger(CREATE_ROOM), createHabitacion);

// Actualizar habitación →
router.put("/:id", auditLogger(UPDATE_ROOM), updateHabitacion);

router.get("/disponibles", getHabitacionesDisponiblesPorDia);

// Eliminar habitación
router.delete("/:id", auditLogger(DELETE_ROOM), deleteHabitacion);

export default router;
