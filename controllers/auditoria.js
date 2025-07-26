import { Auditoria } from "../models/auditoria.js";
import { Usuario } from "../models/usuario.js";

export const getAllAuditorias = async (req, res, next) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const size = parseInt(req.query.size) || 10;

		const limit = size;
		const offset = (page - 1) * size;

		const { count, rows } = await Auditoria.findAndCountAll({
			limit,
			offset,
			order: [["fecha", "DESC"]],
			include: [
				{
					model: Usuario,
					attributes: ["idUsuario", "nombre", "email"],
					required: false,
				},
			],
		});

		// mapear y limpiar antes de devolver
		const auditorias = rows.map((a) => ({
			id: a.id,
			idUsuario: a.idUsuario,
			status: a.status,
			ruta: a.ruta,
			metodo: a.metodo,
			accion: a.accion,
			fecha: a.fecha,
			datos: a.datos,
			nombreUsuario: a.Usuario?.nombre ?? null,
			emailUsuario: a.Usuario?.email ?? null,
		}));

		res.json({
			total: count,
			page,
			pageSize: size,
			data: auditorias,
		});
	} catch (error) {
		console.error("Error al obtener auditorías:", error);
		next(error);
	}
};
