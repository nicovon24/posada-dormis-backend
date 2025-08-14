// controllers/dashboard.controller.js (ESM)
import { Op, fn, col, literal } from 'sequelize';
import { Habitacion, Reserva } from '../models/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

// Granularidades por nombre (si no usás bucketDays)
const GRAN_MAP = { day: 'day', week: 'week', month: 'month', year: 'year' };

// Si querés usar "ventas" por estado en vez de montoPagado>0, poné ids acá
const ESTADOS_VENTA_IDS = []; // p.ej.: [2, 3]  // y usá ?ventaBy=estado

// ─────────────────────────────────────────────────────────────────────────────
// Utils de fecha
// ─────────────────────────────────────────────────────────────────────────────
function parseDateISO(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function normalizeRange(fromStr, toStr) {
  const now = new Date();
  const to = parseDateISO(toStr) || now;
  const from =
    parseDateISO(fromStr) ||
    new Date(to.getFullYear(), to.getMonth(), to.getDate() - 29);

  // Normalizamos a UTC boundaries
  const start = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0));
  const end = new Date(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59));
  return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de filtro
// ─────────────────────────────────────────────────────────────────────────────
function whereRangoSolapado(start, end) {
  // fechaDesde <= end AND fechaHasta >= start
  return {
    fechaDesde: { [Op.lte]: end },
    fechaHasta: { [Op.gte]: start },
  };
}

function whereVenta(baseWhere, ventaBy) {
  if (ventaBy === 'estado' && ESTADOS_VENTA_IDS.length) {
    return { ...baseWhere, idEstadoReserva: { [Op.in]: ESTADOS_VENTA_IDS } };
  }
  // default: hay “venta” si hubo pago
  return { ...baseWhere, montoPagado: { [Op.gt]: 0 } };
}

// ─────────────────────────────────────────────────────────────────────────────
/** Totales (reservas, ventas, sumas) */
// ─────────────────────────────────────────────────────────────────────────────
async function getTotals({ start, end, ventaBy }) {
  const whereAll = whereRangoSolapado(start, end);
  const reservasTotal = await Reserva.count({ where: whereAll });

  const [agg] = await Reserva.findAll({
    attributes: [
      [fn('COUNT', col('idReserva')), 'ventas'],
      [fn('COALESCE', fn('SUM', col('montoTotal')), 0), 'montoTotal'],
      [fn('COALESCE', fn('SUM', col('montoPagado')), 0), 'montoPagado'],
    ],
    where: whereVenta(whereAll, ventaBy),
    raw: true,
  });

  return {
    reservasTotal,
    ventasTotal: Number(agg?.ventas || 0),
    montoPagado: Number(agg?.montoPagado || 0),
    montoTotal: Number(agg?.montoTotal || 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de formateo de labels
// ─────────────────────────────────────────────────────────────────────────────
function ddmmy(d, locale = 'es-AR') {
  // d/M (sin cero a la izquierda)
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
}
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function monthLabel(d, locale = 'es-AR', short = false) {
  // Evita “de” en “ene de 2025”
  const s = d.toLocaleDateString(locale, { month: short ? 'short' : 'long', year: 'numeric', timeZone: 'UTC' });
  return s.replace(' de ', ' ');
}
function clampToEnd(d, end) {
  return end && d > end ? new Date(end) : d;
}
function formatBucketLabel(bucketISO, { agruparPor, bucketDays, end, label = 'auto', locale = 'es-AR' }) {
  const start = new Date(bucketISO);
  const hasBuckets = Number(bucketDays) > 0;

  // Elegir modo si 'auto'
  let mode = label;
  if (label === 'auto') {
    if (hasBuckets) mode = 'range';
    else if ((agruparPor || 'day') === 'month') mode = 'monthShort';
    else if (agruparPor === 'week') mode = 'weekRange';
    else if (agruparPor === 'year') mode = 'year';
    else mode = 'dateShort';
  }

  if (mode === 'month' || mode === 'monthShort') {
    return monthLabel(start, locale, mode === 'monthShort'); // ej: "ene 2025"
  }
  if (mode === 'year') {
    return start.toLocaleDateString(locale, { year: 'numeric', timeZone: 'UTC' });
  }
  if (mode === 'date') {
    return isoDate(start); // "2025-08-13"
  }
  if (mode === 'dateShort') {
    return ddmmy(start, locale); // "20/8"
  }
  if (mode === 'weekRange') {
    const endRange = clampToEnd(
      new Date(Date.UTC(
        start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 0, 0, 0
      )),
      end
    );
    return `${ddmmy(start, locale)}–${ddmmy(endRange, locale)}`; // "12/8–18/8"
  }
  if (mode === 'range') {
    const days = Math.max(1, Math.floor(+bucketDays || 1));
    const endRange = clampToEnd(
      new Date(Date.UTC(
        start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + (days - 1), 0, 0, 0
      )),
      end
    );
    return `${ddmmy(start, locale)}–${ddmmy(endRange, locale)}`; // "01/01–10/01"
  }
  // fallback
  return isoDate(start);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bucket expr (agrupación en SQL) utilitario
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Expresión de BUCKET para agrupar:
 * - Para day/month/year → date_trunc(...).
 * - Para bucketDays → Fallback universal (sin date_bin): ancla al origin y agrupa cada N días.
 *
 * tsExpr: expresión SQL del timestamp a bucketer (p.ej. '"fechaDesde" AT TIME ZONE 'UTC'')
 */
function bucketExprOn({ agruparPor, bucketDays, originIso, tsExpr }) {
  if (Number(bucketDays) > 0) {
    const d = Math.max(1, Math.floor(+bucketDays));
    // Fallback para PG <14 (sin date_bin)
    return `
      (
        DATE_TRUNC('day', '${originIso}'::timestamptz)
        + FLOOR(
            EXTRACT(EPOCH FROM ((${tsExpr}) - '${originIso}'::timestamptz))
            / (${d}*86400)
          ) * INTERVAL '${d} days'
      )
    `;
  }
  const gran = GRAN_MAP[agruparPor] || 'day';
  return `date_trunc('${gran}', ${tsExpr})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetría (única, por fecha de check-in)
// ─────────────────────────────────────────────────────────────────────────────
async function getTelemetry({
  start,
  end,
  agruparPor,
  ventaBy,
  bucketDays,
  label = 'auto',
  locale = 'es-AR',
}) {
  const originIso = start.toISOString();

  // Buckets basados en fechaDesde (día de check-in)
  const bucketSQL = bucketExprOn({
    agruparPor,
    bucketDays,
    originIso,
    tsExpr: `"fechaDesde" AT TIME ZONE 'UTC'`,
  });

  // Solo consideramos reservas que INICIAN dentro del rango
  const whereStartOnly = {
    fechaDesde: { [Op.between]: [start, end] },
  };

  // RESERVAS por bucket
  const reservasSeries = await Reserva.findAll({
    attributes: [
      [literal(bucketSQL), 'bucket'],
      [fn('COUNT', col('idReserva')), 'count'],
    ],
    where: whereStartOnly,
    group: [literal(bucketSQL)],
    order: [literal(bucketSQL)],
    raw: true,
  });

  // VENTAS por bucket (y suma de montoTotal)
  const ventasSeries = await Reserva.findAll({
    attributes: [
      [literal(bucketSQL), 'bucket'],
      [fn('COUNT', col('idReserva')), 'count'],
      [fn('COALESCE', fn('SUM', col('montoTotal')), 0), 'sum'],
    ],
    where: whereVenta(whereStartOnly, ventaBy),
    group: [literal(bucketSQL)],
    order: [literal(bucketSQL)],
    raw: true,
  });

  const mapRow = (r) => {
    const bucketISO = new Date(r.bucket + 'Z').toISOString(); // inicio del bucket en UTC
    return {
      bucket: bucketISO,
      label: formatBucketLabel(bucketISO, { agruparPor, bucketDays, end, label, locale }),
      count: Number(r.count || 0),
      ...(r.sum !== undefined ? { sum: Number(r.sum || 0) } : {}),
    };
  };

  return {
    agruparPor: Number(bucketDays) > 0 ? `${Math.max(1, Math.floor(+bucketDays))}d` : (agruparPor || 'day'),
    reservas: reservasSeries.map(mapRow), // ← solo aparecen buckets con datos
    ventas: ventasSeries.map(mapRow),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
/** Ocupación “ahora” y totales de habitaciones */
// ─────────────────────────────────────────────────────────────────────────────
export async function getCurrentHabitacionesOcupadasCount(now = new Date()) {
  const occupied = await Reserva.count({
    distinct: true,
    col: 'idHabitacion', // o 'HabitacionId' según tu schema
    where: {
      fechaDesde: { [Op.lte]: now },
      fechaHasta: { [Op.gt]: now }, // checkout NO cuenta
    },
  });
  return occupied;
}

export async function getTotalRoomsCount() {
  return Habitacion.count();
}

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// GET /dashboard/summary
export async function getDashboardSummary(req, res, next) {
  try {
    const {
      from,
      to,
      agruparPor = 'day',
      ventaBy = 'pagado',
      bucketDays,
      label = 'auto',
      locale = 'es-AR',
    } = req.query;

    const { start, end } = normalizeRange(from, to);
    const nBucket = bucketDays ? +bucketDays : 0;

    const [totals, habitacionesOcupadas, totalHabitaciones, telemetria] = await Promise.all([
      getTotals({ start, end, ventaBy }),
      getCurrentHabitacionesOcupadasCount(),
      getTotalRoomsCount(),
      getTelemetry({ start, end, agruparPor, ventaBy, bucketDays: nBucket, label, locale }),
    ]);

    const tasaDeOcupacion = totalHabitaciones > 0
      ? (habitacionesOcupadas / totalHabitaciones)
      : 0;

    res.json({
      range: {
        from: start.toISOString().slice(0, 10),
        to: end.toISOString().slice(0, 10),
      },
      totals: {
        telemetria,
        reservas: totals.reservasTotal,
        ventas: totals.ventasTotal,
        montoPagado: totals.montoPagado,
        montoTotal: totals.montoTotal,
        habitacionesOcupadas,
        totalHabitaciones,
        tasaDeOcupacion,                       // 0..1
        tasaDeOcupacionPct: +(tasaDeOcupacion * 100).toFixed(2),
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// GET /dashboard/telemetry  (opcional: llamar separado)
export async function getDashboardTelemetry(req, res, next) {
  try {
    const {
      from,
      to,
      agruparPor = 'day',
      ventaBy = 'pagado',
      bucketDays,
      label = 'auto',
      locale = 'es-AR',
    } = req.query;

    const { start, end } = normalizeRange(from, to);
    const nBucket = bucketDays ? +bucketDays : 0;

    const telemetria = await getTelemetry({
      start, end, agruparPor, ventaBy, bucketDays: nBucket, label, locale,
    });

    res.json(telemetria);
  } catch (err) {
    next(err);
  }
}
