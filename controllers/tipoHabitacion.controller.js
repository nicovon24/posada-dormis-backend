import { TipoHabitacion } from "../models/tipoHabitacion.js";

export const getAllTipoHabitaciones = async (req, res, next) => {
	try {
		const lista = await TipoHabitacion.findAll();
		res.json(lista);
	} catch (err) {
		console.error("Error al obtener tipos de habitación:", err);
		next(err);
	}
};

export const getTipoHabitacionById = async (req, res, next) => {
	try {
		const t = await TipoHabitacion.findByPk(req.params.id);
		if (!t) {
			return res.status(404).json({ error: "No existe tipo de habitación" });
		}
		res.json(t);
	} catch (err) {
		console.error(`Error al obtener tipo de habitación ${req.params.id}:`, err);
		next(err);
	}
};
