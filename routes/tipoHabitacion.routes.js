import { Router } from "express";
import { auditLogger } from "../middlewares/auditLogger.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";
import {
	getAllTipoHabitaciones,
	getTipoHabitacionById,
} from "../controllers/index.js";
import { CREATE_TYPE_ROOM } from "../constants/auditTypes.js";

const router = Router();

// Asegúrate de tener al usuario en req.user antes de auditar
router.use(verifyJWT);

router.get("/", getAllTipoHabitaciones);

router.post("/", auditLogger(CREATE_TYPE_ROOM), getTipoHabitacionById);

export default router;
