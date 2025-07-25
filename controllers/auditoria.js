import { Auditoria } from "../models/auditoria.js";
import { Usuario } from "../models/usuario.js";

export const getAllAuditorias = async (req, res, next) => {
	try {
		const auditorias = await Auditoria.findAll({
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
		const result = auditorias.map((a) => ({
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

		res.json(result);
	} catch (error) {
		console.error("Error al obtener auditorías:", error);
		next(error);
	}
};
