import { Router } from "express";
import { getAllEstadosDeHabitacion } from "../controllers/index.js";

const router = Router();
router.get("/", getAllEstadosDeHabitacion);

export default router;
