import { TipoUsuario } from "../models/tipoUsuario.js";

export const getAllTiposUsuario = async (req, res, next) => {
	try {
		const list = await TipoUsuario.findAll();
		res.json(list);
	} catch (err) {
		console.error("Error al obtener tipos de usuario:", err);
		next(err);
	}
};
