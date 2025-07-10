import express from "express";
import usuarioRouter from "./usuario.routes.js";
import tipoUsuarioRouter from "./tipo-usuario.routes.js";
import huespedRouter from "./huesped.routes.js";
import reservaRouter from "./reserva.routes.js";
import habitacionRouter from "./habitacion.routes.js";
import tipoHabitacionRouter from "./tipo-habitacion.routes.js";
import estadoHabitacionRouter from "./estado-habitacion.routes.js";
import authRouter from "./auth.routes.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";

const router = express.Router();

router.use("/auth", authRouter);

router.use(verifyJWT);

router.use("/usuarios", usuarioRouter);
router.use("/tipos-usuario", tipoUsuarioRouter);
router.use("/huespedes", huespedRouter);
router.use("/reservas", reservaRouter);
router.use("/habitaciones", habitacionRouter);
router.use("/tipos-habitacion", tipoHabitacionRouter);
router.use("/estados-habitacion", estadoHabitacionRouter);

export default router;
