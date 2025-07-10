// src/routes/huesped.routes.js
import { Router } from "express";
import {
	getAllHuespedes,
	getHuespedById,
	createHuesped,
} from "../controllers/index.js";
import { auditLogger } from "../middlewares/auditLogger.js";
import { CREATE_HUESPED } from "../constants/index.js";

const router = Router();

router.get("/", getAllHuespedes);
router.get("/:id", getHuespedById);

// Crear huésped → registra auditoría "crear huésped"
router.post("/", auditLogger(CREATE_HUESPED), createHuesped);

export default router;
