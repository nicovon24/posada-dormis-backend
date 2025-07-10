import express from "express";
import usuarioRouter from "./usuario.routes.js";
import tipoUsuarioRouter from "./tipoUsuario.routes.js";
import huespedRouter from "./huesped.routes.js";
import reservaRouter from "./reserva.routes.js";
import habitacionRouter from "./habitacion.routes.js";
import tipoHabitacionRouter from "./tipoHabitacion.routes.js";
import estadoHabitacionRouter from "./estadoHabitacion.routes.js";
import authRouter from "./auth.routes.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";

const router = express.Router();

router.use("/auth", authRouter);

router.use(verifyJWT);

router.use("/usuarios", usuarioRouter);
router.use("/tipoUsuarios", tipoUsuarioRouter);
router.use("/huespedes", huespedRouter);
router.use("/reservas", reservaRouter);
router.use("/habitaciones", habitacionRouter);
router.use("/tipoHabitaciones", tipoHabitacionRouter);
router.use("/estadoHabitaciones", estadoHabitacionRouter);

export default router;
