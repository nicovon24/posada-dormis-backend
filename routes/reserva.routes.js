import { Router } from "express";
import { Reserva } from "../models/reserva.js";
import { Habitacion } from "../models/habitacion.js";
import { sequelize } from "../db.js";
import { QueryTypes, Op } from "sequelize";
import { Huesped } from "../models/huesped.js";

const router = Router();

// GET /reservas - Obtener todas las reservas
router.get("/", async (req, res) => {
	try {
		const list = await Reserva.findAll({
			include: ["Huesped", "Habitacion"],
		});
		res.json(list);
	} catch (err) {
		console.error("Error al obtener reservas:", err);
		res.status(500).json({ error: "Error interno al obtener reservas" });
	}
});

// GET /reservas/calendar - Fechas totalmente ocupadas
router.get("/calendar", async (req, res) => {
	try {
		const today = new Date();
		const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
			.toISOString()
			.slice(0, 10);
		const endDate = new Date(today.getFullYear(), today.getMonth() + 4, 0)
			.toISOString()
			.slice(0, 10);

		// -- Generate all dates between startDate and endDate, join with overlapping reservations,
		// -- and return only those dates where the number of distinct reserved rooms equals the total room count (fully booked days).

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
		res.json({ fullyBookedDates });
	} catch (err) {
		console.error("Error al calcular calendario:", err);
		res.status(500).json({ error: "Error interno al obtener calendario" });
	}
});

// POST /reservas - Crear nueva reserva
router.post("/", async (req, res) => {
	let {
		idHuesped,
		huesped: huespedData,
		// idUsuario,
		idHabitacion,
		idEstadoReserva,
		fechaDesde,
		fechaHasta,
		montoSenia,
		montoTotal,
	} = req.body;

	try {
		// 1) Si no viene idHuesped, creamos un nuevo Huesped con huespedData
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
			// 2) Si sí viene, validamos que exista
			const existHuesped = await Huesped.findByPk(idHuesped);
			if (!existHuesped) {
				return res.status(400).json({ error: "Huésped no válido" });
			}
		}

		// // 3) Validar Usuario
		// const usuario = await Usuario.findByPk(idUsuario);
		// if (!usuario) {
		// 	return res.status(400).json({ error: "Usuario no válido" });
		// }
		// 4) Validar Habitacion
		const habitacion = await Habitacion.findByPk(idHabitacion);
		if (!habitacion) {
			return res.status(400).json({ error: "Habitación no válida" });
		}

		// 5) Crear la reserva
		const nuevaReserva = await Reserva.create({
			idHuesped,
			// idUsuario,
			idHabitacion,
			idEstadoReserva,
			fechaDesde,
			fechaHasta,
			montoSenia,
			montoTotal,
		});

		// 6) Recuperar con sólo los campos que queremos devolver
		const reservaCompleta = await Reserva.findByPk(nuevaReserva.idReserva, {
			attributes: [
				"idReserva",
				"fechaDesde",
				"fechaHasta",
				"montoSenia",
				"montoTotal",
			],
			include: [
				{
					model: Huesped,
					attributes: ["dni", "telefono", "email", "origen"],
				},
				{
					model: Habitacion,
					attributes: ["numero"],
				},
			],
		});

		return res.status(201).json(reservaCompleta);
	} catch (err) {
		console.error("Error al crear reserva:", err);
		if (
			err.nombre === "SequelizeValidationError" ||
			err.nombre === "SequelizeForeignKeyConstraintError"
		) {
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		return res.status(500).json({ error: "Error interno al crear la reserva" });
	}
});

// PUT /reservas/:id - Actualizar reserva
router.put("/:id", async (req, res) => {
	try {
		const r = await Reserva.findByPk(req.params.id);
		if (!r) return res.status(404).json({ error: "No existe reserva" });

		await r.update(req.body);
		res.json(r);
	} catch (err) {
		console.error(`Error al actualizar reserva ${req.params.id}:`, err);
		if (
			err.nombre === "SequelizeValidationError" ||
			err.nombre === "SequelizeForeignKeyConstraintError"
		) {
			return res.status(400).json({ error: err.errors.map((e) => e.message) });
		}
		res.status(500).json({ error: "Error interno al actualizar la reserva" });
	}
});

// DELETE /reservas/:id - Eliminar reserva
router.delete("/:id", async (req, res) => {
	try {
		const r = await Reserva.findByPk(req.params.id);
		if (!r) return res.status(404).json({ error: "No existe reserva" });

		await r.destroy();
		res.status(204).end();
	} catch (err) {
		console.error(`Error al eliminar reserva ${req.params.id}:`, err);
		res.status(500).json({ error: "Error interno al eliminar la reserva" });
	}
});

export default router;
