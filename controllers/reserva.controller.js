import { Reserva } from "../models/reserva.js";
import { Habitacion } from "../models/habitacion.js";
import { Huesped } from "../models/huesped.js";
import { sequelize } from "../db.js";
import { QueryTypes } from "sequelize";

export const getAllReservas = async (req, res, next) => {
	try {
		const list = await Reserva.findAll({
			include: ["Huesped", "Habitacion"],
		});
		return res.json(list);
	} catch (err) {
		console.error("Error al obtener reservas:", err);
		return next(err);
	}
};

export const getReservasCalendar = async (req, res, next) => {
	try {
		const today = new Date();
		const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
			.toISOString()
			.slice(0, 10);
		const endDate = new Date(today.getFullYear(), today.getMonth() + 4, 0)
			.toISOString()
			.slice(0, 10);

		const sql = `
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date
      FROM generate_series(
        :startDate::date,
        :endDate::date,
        '1 day'
      ) AS d(day)
      LEFT JOIN "Reserva" r
        ON r."fechaDesde" < (:endDate::date + INTERVAL '1 day')
       AND r."fechaHasta"   > :startDate::date
       AND d.day BETWEEN date_trunc('day', r."fechaDesde") AND date_trunc('day', r."fechaHasta")
      GROUP BY d.day
      HAVING count(DISTINCT r."idHabitacion") = (
        SELECT count(*) FROM "Habitacion"
      )
      ORDER BY d.day;
    `;
		const rows = await sequelize.query(sql, {
			replacements: { startDate, endDate },
			type: QueryTypes.SELECT,
		});
		const fullyBookedDates = rows.map((r) => r.date);
		return res.json({ fullyBookedDates });
	} catch (err) {
		console.error("Error al calcular calendario:", err);
		return next(err);
	}
};

export const createReserva = async (req, res, next) => {
	let {
		idHuesped,
		huesped: huespedData,
		idHabitacion,
		idEstadoReserva,
		fechaDesde,
		fechaHasta,
		montoSenia,
		montoTotal,
	} = req.body;

	try {
		// 1) Crear o validar huésped
		if (!idHuesped) {
			const required = [
				"dni",
				"telefono",
				"email",
				"origen",
				"nombre",
				"apellido",
			];
			const missing = required.filter((f) => !huespedData?.[f]);
			if (missing.length) {
				return res
					.status(400)
					.json({ error: `Faltan datos para crear huésped: ${missing.join(", ")}` });
			}
			const nuevo = await Huesped.create({
				dni: huespedData.dni,
				telefono: huespedData.telefono,
				email: huespedData.email,
				origen: huespedData.origen,
				nombre: huespedData.nombre,
				apellido: huespedData.apellido,
			});
			idHuesped = nuevo.idHuesped;
		} else {
			const exist = await Huesped.findByPk(idHuesped);
			if (!exist) {
				return res.status(400).json({ error: "Huésped no válido" });
			}
		}

		// 2) Validar habitación
		const habitacion = await Habitacion.findByPk(idHabitacion);
		if (!habitacion) {
			return res.status(400).json({ error: "Habitación no válida" });
		}

		// 3) Crear reserva
		const nuevaReserva = await Reserva.create({
			idHuesped,
			idHabitacion,
			idEstadoReserva,
			fechaDesde,
			fechaHasta,
			montoSenia,
			montoTotal,
		});

		// 4) Devolver sólo campos necesarios
		const reservaCompleta = await Reserva.findByPk(nuevaReserva.idReserva, {
			attributes: [
				"idReserva",
				"fechaDesde",
				"fechaHasta",
				"montoSenia",
				"montoTotal",
			],
			include: [
				{ model: Huesped, attributes: ["dni", "telefono", "email", "origen"] },
				{ model: Habitacion, attributes: ["numero"] },
			],
		});

		return res.status(201).json(reservaCompleta);
	} catch (err) {
		console.error("Error al crear reserva:", err);
		if (
			err.name === "SequelizeValidationError" ||
			err.name === "SequelizeForeignKeyConstraintError"
		) {
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		return next(err);
	}
};

export const updateReserva = async (req, res, next) => {
	try {
		const r = await Reserva.findByPk(req.params.id);
		if (!r) return res.status(404).json({ error: "No existe reserva" });
		await r.update(req.body);
		return res.json(r);
	} catch (err) {
		console.error(`Error al actualizar reserva ${req.params.id}:`, err);
		if (
			err.name === "SequelizeValidationError" ||
			err.name === "SequelizeForeignKeyConstraintError"
		) {
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		return next(err);
	}
};

export const deleteReserva = async (req, res, next) => {
	try {
		const r = await Reserva.findByPk(req.params.id);
		if (!r) return res.status(404).json({ error: "No existe reserva" });
		await r.destroy();
		return res.status(204).end();
	} catch (err) {
		console.error(`Error al eliminar reserva ${req.params.id}:`, err);
		return next(err);
	}
};
