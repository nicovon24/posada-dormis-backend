import { Router } from "express";
import { auditLogger } from "../middlewares/auditLogger.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";
import {
	createTipoHabitacion,
	getAllTipoHabitaciones,
} from "../controllers/index.js";
import { CREATE_TYPE_RESERVATION } from "../constants/auditTypes.js";

const router = Router();

// Asegúrate de tener al usuario en req.user antes de auditar
router.use(verifyJWT);

router.get("/", getAllTipoHabitaciones);

router.post("/", auditLogger(CREATE_TYPE_RESERVATION), createTipoHabitacion);

export default router;
