import { Router } from "express";
import { TipoUsuario } from "../models/tipoUsuario.js";
const router = Router();

// GET /tipos-usuario
router.get("/", async (req, res) => {
	try {
		const list = await TipoUsuario.findAll();
		res.json(list);
	} catch (err) {
		console.error("Error al obtener tipos de usuario:", err);
		res.status(500).json({ error: "Error interno al obtener tipos de usuario" });
	}
});

export default router;
