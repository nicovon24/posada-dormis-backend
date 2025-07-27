import { Habitacion } from "../models/habitacion.js";
import { TipoHabitacion } from "../models/tipoHabitacion.js";
import { EstadoHabitacion } from "../models/estadoHabitacion.js";
import { Op, Sequelize } from "sequelize";

export const getAllHabitaciones = async (req, res, next) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const size = parseInt(req.query.size) || 10;
		const sortField = req.query.sortField || "numero";
		const sortOrder =
			req.query.sortOrder?.toUpperCase() === "DESC" ? "DESC" : "ASC";
		const search = req.query.search?.trim().toLowerCase() || "";

		const limit = size;
		const offset = (page - 1) * size;

		const isNumericSearch = !isNaN(Number(search));

		const whereCondition = search
			? {
					[Op.or]: [
						isNumericSearch ? { numero: Number(search) } : null,
						Sequelize.where(Sequelize.col("TipoHabitacion.tipo"), {
							[Op.iLike]: `%${search}%`,
						}),
						Sequelize.where(Sequelize.col("EstadoHabitacion.estado"), {
							[Op.iLike]: `%${search}%`,
						}),
					].filter(Boolean), // elimina los null
			  }
			: {};

		const { rows, count } = await Habitacion.findAndCountAll({
			include: ["TipoHabitacion", "EstadoHabitacion"],
			where: whereCondition,
			order: [[sortField, sortOrder]],
			limit: limit,
			offset,
		});

		const formattedData = rows.map((h) => ({
			idHabitacion: h.idHabitacion,
			numero: h.numero,
			precio: h.TipoHabitacion?.precio ?? null,
			habilitada: h.habilitada,
			tipo: h.TipoHabitacion?.tipo ?? null,
			estado: h.EstadoHabitacion?.estado ?? null,
		}));

		res.json({
			total: count,
			page,
			pageSize: size,
			data: formattedData,
			sortField,
			sortOrder,
		});
	} catch (err) {
		console.error("Error fcapaz etching habitaciones:", err);
		next(err);
	}
};

export const createHabitacion = async (req, res, next) => {
	const { idTipoHabitacion, idEstadoHabitacion, numero } = req.body;
	try {
		const tipo = await TipoHabitacion.findByPk(idTipoHabitacion);
		if (!tipo)
			return res.status(400).json({ error: "Tipo de habitación no válido" });

		const estado = await EstadoHabitacion.findByPk(idEstadoHabitacion);
		if (!estado)
			return res.status(400).json({ error: "Estado de habitación no válido" });

		const nueva = await Habitacion.create({
			idTipoHabitacion,
			idEstadoHabitacion,
			numero,
		});
		res.status(201).json(nueva);
	} catch (err) {
		console.error("Error creando habitación:", err);
		if (err.name === "SequelizeValidationError") {
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		next(err);
	}
};

export const updateHabitacion = async (req, res, next) => {
	const { idTipoHabitacion, idEstadoHabitacion, numero } = req.body;
	try {
		const h = await Habitacion.findByPk(req.params.id);
		if (!h) return res.status(404).json({ error: "No existe habitación" });

		if (idTipoHabitacion !== undefined) {
			const tipo = await TipoHabitacion.findByPk(idTipoHabitacion);
			if (!tipo)
				return res.status(400).json({ error: "Tipo de habitación no válido" });
			h.idTipoHabitacion = idTipoHabitacion;
		}

		if (idEstadoHabitacion !== undefined) {
			const estado = await EstadoHabitacion.findByPk(idEstadoHabitacion);
			if (!estado)
				return res.status(400).json({ error: "Estado de habitación no válido" });
			h.idEstadoHabitacion = idEstadoHabitacion;
		}

		if (numero !== undefined) {
			h.numero = numero;
		}

		await h.save();
		res.json(h);
	} catch (err) {
		console.error(`Error actualizando habitación ${req.params.id}:`, err);
		if (err.name === "SequelizeValidationError") {
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		next(err);
	}
};

export const deleteHabitacion = async (req, res, next) => {
	try {
		const h = await Habitacion.findByPk(req.params.id);
		if (!h) return res.status(404).json({ error: "No existe habitación" });

		await h.destroy();
		res.status(204).end();
	} catch (err) {
		console.error(`Error eliminando habitación ${req.params.id}:`, err);
		next(err);
	}
};
