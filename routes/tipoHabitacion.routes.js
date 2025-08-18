import { Router } from "express";
import { auditLogger } from "../middlewares/auditLogger.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";
import {
	createTipoHabitacion,
	getAllTipoHabitaciones,
} from "../controllers/index.js";
import { CREATE_TYPE_RESERVATION } from "../constants/auditTypes.js";
import { authorize } from "../middlewares/authorize.js";

const router = Router();

const tipoModelo = "tipoHabitacion";

// Asegúrate de tener al usuario en req.user antes de auditar
router.use(verifyJWT);

router.get("/", authorize(tipoModelo, "read"), getAllTipoHabitaciones);

router.post("/", authorize(tipoModelo, "create"), auditLogger(CREATE_TYPE_RESERVATION), createTipoHabitacion);

export default router;
