import { Router } from "express";
import {
	createEstadoDeHabitacion,
	getAllEstadosDeHabitacion,
} from "../controllers/index.js";
import { CREATE_ROOM_TYPE } from "../constants/auditTypes.js";
import { auditLogger } from "../middlewares/auditLogger.js";

const router = Router();
router.get("/", getAllEstadosDeHabitacion);
router.post("/", auditLogger(CREATE_ROOM_TYPE), createEstadoDeHabitacion);

export default router;
