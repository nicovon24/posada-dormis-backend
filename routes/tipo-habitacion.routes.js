// src/routes/tipo-habitacion.routes.js
import { Router } from "express";
import { TipoHabitacion } from "../models/tipoHabitacion.js";
import { Sequelize } from "sequelize";

const router = Router();
const requiredFields = ["tipo", "precio"];

// GET /tipos-habitacion
router.get("/", async (req, res) => {
	try {
		const lista = await TipoHabitacion.findAll();
		res.json(lista);
	} catch (err) {
		console.error("Error al obtener tipos de habitación:", err);
		res
			.status(500)
			.json({ error: "Error interno al obtener tipos de habitación" });
	}
});

// GET /tipos-habitacion/:id
router.get("/:id", async (req, res) => {
	try {
		const t = await TipoHabitacion.findByPk(req.params.id);
		if (!t)
			return res.status(404).json({ error: "No existe tipo de habitación" });
		res.json(t);
	} catch (err) {
		console.error(`Error al obtener tipo de habitación ${req.params.id}:`, err);
		res
			.status(500)
			.json({ error: "Error interno al obtener el tipo de habitación" });
	}
});

export default router;
