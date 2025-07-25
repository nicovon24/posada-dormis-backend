import { EstadoHabitacion } from "../models/estadoHabitacion.js";

/**
 * Devuelve todos los estados de habitación
 */
export const getAllEstadosDeHabitacion = async (req, res, next) => {
	try {
		const estados = await EstadoHabitacion.findAll();
		return res.json(estados);
	} catch (error) {
		// Pasa el error al handler de errores de Express
		next(error);
	}
};

/**
 * Crea un nuevo estado de habitación
 */

export const createEstadoDeHabitacion = async (req, res, next) => {
	try {
		const { estado } = req.body;

		if (!estado) {
			return res.status(400).json({ mensaje: "El estado es obligatorio" });
		}

		const nuevoEstado = await EstadoHabitacion.create({ estado });

		return res.status(201).json(nuevoEstado);
	} catch (error) {
		next(error);
	}
};
