// src/routes/habitacion.routes.js
import { Router } from "express";
import { Habitacion } from "../models/habitacion.js";
import { TipoHabitacion } from "../models/tipoHabitacion.js";
import { EstadoHabitacion } from "../models/estadoHabitacion.js";

const router = Router();

// GET /habitaciones
router.get("/", async (req, res) => {
	try {
		const lista = await Habitacion.findAll({
			include: ["TipoHabitacion", "EstadoHabitacion"],
		});
		res.json(lista);
	} catch (err) {
		console.error("Error fetching habitaciones:", err);
		res.status(500).json({ error: "Error interno al obtener habitaciones" });
	}
});

// GET /habitaciones/:id
router.get("/:id", async (req, res) => {
	try {
		const h = await Habitacion.findByPk(req.params.id, {
			include: ["TipoHabitacion", "EstadoHabitacion"],
		});
		if (!h) return res.status(404).json({ error: "No existe habitación" });
		res.json(h);
	} catch (err) {
		console.error(`Error fetching habitación ${req.params.id}:`, err);
		res.status(500).json({ error: "Error interno al obtener la habitación" });
	}
});

// POST /habitaciones
router.post("/", async (req, res) => {
	const { idTipoHabitacion, idEstadoHabitacion, numero } = req.body;
	try {
		const tipo = await TipoHabitacion.findByPk(idTipoHabitacion);
		if (!tipo)
			return res.status(400).json({ error: "Tipo de habitación no válido" });

		const estado = await EstadoHabitacion.findByPk(idEstadoHabitacion);
		if (!estado)
			return res.status(400).json({ error: "Estado de habitación no válido" });

		const nueva = await Habitacion.create({
			idTipoHabitacion,
			idEstadoHabitacion,
			numero,
		});
		res.status(201).json(nueva);
	} catch (err) {
		console.error("Error creando habitación:", err);
		if (err.nombre === "SequelizeValidationError") {
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		res.status(500).json({ error: "Error interno al crear la habitación" });
	}
});

// PUT /habitaciones/:id
router.put("/:id", async (req, res) => {
	const { idTipoHabitacion, idEstadoHabitacion, numero } = req.body;
	try {
		const h = await Habitacion.findByPk(req.params.id);
		if (!h) return res.status(404).json({ error: "No existe habitación" });

		if (idTipoHabitacion !== undefined) {
			const tipo = await TipoHabitacion.findByPk(idTipoHabitacion);
			if (!tipo)
				return res.status(400).json({ error: "Tipo de habitación no válido" });
			h.idTipoHabitacion = idTipoHabitacion;
		}

		if (idEstadoHabitacion !== undefined) {
			const estado = await EstadoHabitacion.findByPk(idEstadoHabitacion);
			if (!estado)
				return res.status(400).json({ error: "Estado de habitación no válido" });
			h.idEstadoHabitacion = idEstadoHabitacion;
		}

		if (numero !== undefined) {
			h.numero = numero;
		}

		await h.save();
		res.json(h);
	} catch (err) {
		console.error(`Error actualizando habitación ${req.params.id}:`, err);
		if (err.nombre === "SequelizeValidationError") {
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		res.status(500).json({ error: "Error interno al actualizar la habitación" });
	}
});

// DELETE /habitaciones/:id
router.delete("/:id", async (req, res) => {
	try {
		const h = await Habitacion.findByPk(req.params.id);
		if (!h) return res.status(404).json({ error: "No existe habitación" });

		await h.destroy();
		res.status(204).end();
	} catch (err) {
		console.error(`Error eliminando habitación ${req.params.id}:`, err);
		res.status(500).json({ error: "Error interno al eliminar la habitación" });
	}
});

export default router;
