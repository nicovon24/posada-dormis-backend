// src/routes/huesped.routes.js
import { Router } from "express";
import { Huesped } from "../models/huesped.js";
import { Sequelize } from "sequelize";

const router = Router();
const requiredFields = [
	"nombre",
	"apellido",
	"dni",
	"telefono",
	"email",
	"origen",
];

// GET /huespedes
router.get("/", async (req, res) => {
	try {
		const list = await Huesped.findAll();
		res.json(list);
	} catch (err) {
		console.error("Error al obtener huéspedes:", err);
		res.status(500).json({ error: "Error interno al obtener huéspedes" });
	}
});

// GET /huespedes/:id
router.get("/:id", async (req, res) => {
	try {
		const h = await Huesped.findByPk(req.params.id);
		if (!h) return res.status(404).json({ error: "No existe huésped" });
		res.json(h);
	} catch (err) {
		console.error(`Error al obtener huésped ${req.params.id}:`, err);
		res.status(500).json({ error: "Error interno al obtener el huésped" });
	}
});

// POST /huespedes
router.post("/", async (req, res) => {
	const missing = requiredFields.filter((field) => !req.body[field]);
	if (missing.length) {
		return res
			.status(400)
			.json({ error: `Faltan campos obligatorios: ${missing.join(", ")}` });
	}

	try {
		const nuevo = await Huesped.create(req.body);
		res.status(201).json(nuevo);
	} catch (err) {
		console.error("Error al crear huésped:", err);
		if (err instanceof Sequelize.ValidationError) {
			// Errores de validación de Sequelize (tipo, largo, formato, etc.)
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		if (err instanceof Sequelize.UniqueConstraintError) {
			// Por ejemplo, si definiste campo único (dni o email)
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		res.status(500).json({ error: "Error interno al crear el huésped" });
	}
});

export default router;
