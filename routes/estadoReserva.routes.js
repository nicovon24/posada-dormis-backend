import { Router } from "express";
import {
	getAllEstadosDeReserva,
	createEstadoDeReserva,
} from "../controllers/index.js";
import { CREATE_ROOM_TYPE } from "../constants/auditTypes.js";
import { auditLogger } from "../middlewares/auditLogger.js";

const router = Router();
router.get("/", getAllEstadosDeReserva);
router.post("/", auditLogger(CREATE_ROOM_TYPE), createEstadoDeReserva);

export default router;
