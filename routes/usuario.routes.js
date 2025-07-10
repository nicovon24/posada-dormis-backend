// src/routes/usuario.js
import { Router } from "express";
import { Usuario } from "../models/usuario.js";
const router = Router();

// GET /usuarios
router.get("/", async (req, res) => {
	const lista = await Usuario.findAll();
	res.json(lista);
});

// DELETE /usuarios/:id
router.delete("/:id", async (req, res) => {
	const u = await Usuario.findByPk(req.params.id);
	if (!u) return res.status(404).json({ error: "No existe usuario" });
	await u.destroy();
	res.status(204).end();
});

export default router;
