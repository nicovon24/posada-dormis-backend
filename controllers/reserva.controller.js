import { Reserva } from "../models/reserva.js";
import { Habitacion } from "../models/habitacion.js";
import { Huesped } from "../models/huesped.js";
import { sequelize } from "../db.js";
import { Op, QueryTypes } from "sequelize";
import { TipoHabitacion } from "../models/tipoHabitacion.js";

export const getAllReservas = async (req, res, next) => {
	try {
		const list = await Reserva.findAll({
			include: ["Huesped", "Habitacion"],
		});

		const reservasFormateadas = list.map((r) => ({
			id: r.idReserva,
			numeroHab: r.Habitacion?.numero ?? "-",
			ingreso: r.fechaDesde ? new Date(r.fechaDesde).toLocaleDateString() : "-",
			egreso: r.fechaHasta ? new Date(r.fechaHasta).toLocaleDateString() : "-",
			huespedNombre: r.Huesped ? `${r.Huesped.nombre} ${r.Huesped.apellido}` : "-",
			telefonoHuesped: r.Huesped?.telefono ?? "-",
			dniHuesped: r.Huesped?.dni ?? "-",
			emailHuesped: r.Huesped?.email ?? "-",
			montoPagado: r.montoPagado,
			total: r.montoTotal,
			estadoDeReserva: r.idEstadoReserva,
		}));

		return res.json(reservasFormateadas);
	} catch (err) {
		console.error("Error al obtener reservas:", err);
		return next(err);
	}
};

export const getReservasCalendar = async (req, res, next) => {
	try {
		const today = new Date();
		const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
			.toISOString().slice(0, 10);
		const endDate = new Date(today.getFullYear(), today.getMonth() + 4, 0)
			.toISOString().slice(0, 10);

		// ---- parseo robusto de IDs ----
		const parseIds = (val) => {
			if (!val) return [];
			if (Array.isArray(val)) {
				return val.flatMap(v => String(v).split(","))
					.map(v => Number(v))
					.filter(Number.isFinite);
			}
			if (typeof val === "string") {
				return val.split(",").map(v => Number(v)).filter(Number.isFinite);
			}
			if (typeof val === "number" && Number.isFinite(val)) return [val];
			return [];
		};

		const ids = Array.from(new Set([
			...parseIds(req?.query?.habitacionesIds),
			...parseIds(req?.query?.roomIds),
			...parseIds(req?.query?.rooms),
			...parseIds(req?.body?.habitacionesIds),
			...parseIds(req?.body?.roomIds),
			...parseIds(req?.body?.rooms),
		]));

		const usarFiltro = ids.length > 0;

		// ---- 1) contar habitaciones del universo a evaluar (raw SQL) ----
		const countSql = `
      SELECT COUNT(*)::int AS total
      FROM "Habitacion"
      ${usarFiltro ? 'WHERE "Habitacion"."idHabitacion" IN (:ids)' : ''};
    `;
		const countRows = await sequelize.query(countSql, {
			type: QueryTypes.SELECT,
			replacements: usarFiltro ? { ids } : {},
			// logging: console.log,
		});
		const totalSubset = countRows?.[0]?.total ?? 0;

		// Si no hay habitaciones en el subset, no puede haber días completos
		if (!totalSubset) {
			return res.json({ fullyBookedDates: [] });
		}

		// ---- 2) query de calendario (raw SQL) ----
		const filtroHabitaciones = usarFiltro ? 'AND r."idHabitacion" IN (:ids)' : '';

		console.log(filtroHabitaciones);

		const calendarSql = `
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date
      FROM generate_series(:startDate::date, :endDate::date, '1 day') AS d(day)
      LEFT JOIN "Reserva" r
        ON r."fechaDesde" < (:endDate::date + INTERVAL '1 day')
       AND r."fechaHasta" > :startDate::date
       AND d.day BETWEEN date_trunc('day', r."fechaDesde") AND date_trunc('day', r."fechaHasta")
       ${filtroHabitaciones}
      GROUP BY d.day
      HAVING COUNT(DISTINCT r."idHabitacion") = :totalSubset
      ORDER BY d.day;
    `;

		const rows = await sequelize.query(calendarSql, {
			type: QueryTypes.SELECT,
			replacements: {
				startDate,
				endDate,
				totalSubset,
				...(usarFiltro ? { ids } : {}),
			},
			// logging: console.log,
		});

		const fullyBookedDates = rows.map(r => r.date);
		return res.json({ fullyBookedDates });
	} catch (err) {
		console.error("Error al calcular calendario:", {
			message: err?.message,
			detail: err?.original?.detail || err?.parent?.detail,
			sql: err?.sql,
			parameters: err?.parameters,
			stack: err?.stack,
		});
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
		montoPagado,
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

		// 2) Validar habitación y obtener precio desde TipoHabitacion
		const habitacion = await Habitacion.findByPk(idHabitacion, {
			include: [{ model: TipoHabitacion, attributes: ["precio"] }],
		});

		if (!habitacion) {
			return res.status(400).json({ error: "Habitación no válida" });
		}

		const precioPorNoche = habitacion.TipoHabitacion.precio;

		// 3) Calcular montoTotal (precio x días)
		const dias = Math.ceil(
			(new Date(fechaHasta) - new Date(fechaDesde)) / (1000 * 60 * 60 * 24)
		);

		if (dias <= 0) {
			return res.status(400).json({ error: "Rango de fechas inválido" });
		}

		const montoTotal = precioPorNoche * dias;

		// 4) Validar montoPagado
		if (montoPagado > montoTotal) {
			return res
				.status(400)
				.json({ error: "La seña no puede ser mayor al monto total" });
		}

		// 5) Crear reserva
		const nuevaReserva = await Reserva.create({
			idHuesped,
			idHabitacion,
			idEstadoReserva,
			fechaDesde,
			fechaHasta,
			montoPagado,
			montoTotal,
		});

		// 6) Devolver datos
		const reservaCompleta = await Reserva.findByPk(nuevaReserva.idReserva, {
			attributes: [
				"idReserva",
				"fechaDesde",
				"fechaHasta",
				"montoPagado",
				"montoTotal",
			],
			include: [
				{ model: Huesped, attributes: ["dni", "telefono", "email", "origen"] },
				{
					model: Habitacion,
					attributes: ["numero"],
					include: [{ model: TipoHabitacion, attributes: ["precio"] }],
				},
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
