import { Huesped } from "../models/huesped.js";
import { Sequelize } from "sequelize";

const requiredFields = [
	"nombre",
	"apellido",
	"dni",
	"telefono",
	"email",
	"origen",
];

export const getAllHuespedes = async (req, res, next) => {
	try {
		const list = await Huesped.findAll();
		res.json(list);
	} catch (err) {
		console.error("Error al obtener huéspedes:", err);
		next(err);
	}
};

export const getHuespedById = async (req, res, next) => {
	try {
		const h = await Huesped.findByPk(req.params.id);
		if (!h) return res.status(404).json({ error: "No existe huésped" });
		res.json(h);
	} catch (err) {
		console.error(`Error al obtener huésped ${req.params.id}:`, err);
		next(err);
	}
};

export const createHuesped = async (req, res, next) => {
	// Validación de campos obligatorios
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
		if (
			err instanceof Sequelize.ValidationError ||
			err instanceof Sequelize.UniqueConstraintError
		) {
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		next(err);
	}
};
