import { Usuario } from "../models/usuario.js";

/**
 * GET /usuarios
 */
export const getAllUsuarios = async (req, res, next) => {
	try {
		const lista = await Usuario.findAll();
		return res.json(lista);
	} catch (err) {
		console.error("Error al obtener usuarios:", err);
		return next(err);
	}
};

/**
 * DELETE /usuarios/:id
 */
export const deleteUsuario = async (req, res, next) => {
	try {
		const u = await Usuario.findByPk(req.params.id);
		if (!u) {
			return res.status(404).json({ error: "No existe usuario" });
		}
		await u.destroy();
		return res.status(204).end();
	} catch (err) {
		console.error(`Error al eliminar usuario ${req.params.id}:`, err);
		return next(err);
	}
};
