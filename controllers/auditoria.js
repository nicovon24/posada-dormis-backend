import { Auditoria } from "../models/auditoria.js";

export const getAllAuditorias = async (req, res, next) => {
	try {
		const auditorias = await Auditoria.findAll({
			order: [["fecha", "DESC"]],
		});
		res.json(auditorias);
	} catch (error) {
		console.error("Error al obtener auditorías:", error);
		next(error);
	}
};
