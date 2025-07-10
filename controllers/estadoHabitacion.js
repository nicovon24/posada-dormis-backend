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
