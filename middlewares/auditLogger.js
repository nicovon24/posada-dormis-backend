import { Auditoria } from "../models/auditoria.js";

export const auditLogger = (action) => (req, res, next) => {
	// Suponemos que verifyJWT ya ha puesto en req.user el objeto { idUsuario, ... }
	const usuarioId = req.user?.userId ?? null;

	// Después de que Express termine de enviar la respuesta:
	res.on("finish", async () => {
		// Solo auditamos respuestas exitosas < 400
		// if (res.statusCode < 400) {
		try {
			await Auditoria.create({
				usuarioId,
				ruta: req.originalUrl,
				metodo: req.method,
				accion: action,
				status: res.statusCode,
				// Sequelize rellenará fecha automáticamente, pero lo incluimos explícito:
				fecha: new Date(),
				datos: { params: req.params, body: req.body },
			});
		} catch (err) {
			// No interrumpimos la respuesta al cliente, pero lo logueamos
			console.error("Error guardando auditoría:", err);
		}
		// }
	});

	next();
};
