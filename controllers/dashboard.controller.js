// controllers/dashboard.controller.js (ESM)
import { Op, fn, col, literal } from 'sequelize';
import { Habitacion, Reserva } from '../models/index.js';

// Granularidades por nombre (si no usás bucketDays)
const GRAN_MAP = { day: 'day', week: 'week', month: 'month' };

// Si querés usar "ventas" por estado en vez de montoPagado>0, poné ids acá
const ESTADOS_VENTA_IDS = []; // p.ej.: [2,3]  // y usá ?ventaBy=estado

// -------------------- util fechas --------------------
function parseDateISO(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function normalizeRange(fromStr, toStr) {
  const now = new Date();
  const to = parseDateISO(toStr) || now;
  const from = parseDateISO(fromStr) || new Date(to.getFullYear(), to.getMonth(), to.getDate() - 29);
  const start = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0));
  const end = new Date(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59));
  return { start, end };
}

// -------------------- helpers de filtro --------------------
function whereRangoSolapado(start, end) {
  // solapa con [start, end] inclusive: fechaDesde <= end  AND  fechaHasta >= start
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

// -------------------- totales --------------------
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

// -------------------- bucketing (telemetría) --------------------
/**
 * Construye la expresión SQL del bucket:
 * - Si bucketDays > 0: date_bin(INTERVAL 'N days', ts, origin)
 * - Si no: date_trunc(day|week|month, ts)
 */
function buildBucketExpr({ granularity, bucketDays, origin }) {
  const originIso = origin.toISOString(); // ancla estable para date_bin
  const safeDays = Number.isFinite(+bucketDays) ? Math.max(1, Math.floor(+bucketDays)) : 0;

  if (safeDays > 0) {
    // PostgreSQL 14+
    return `date_bin(interval '${safeDays} days', "fechaDesde" AT TIME ZONE 'UTC', '${originIso}'::timestamptz)`;
  }

  const gran = GRAN_MAP[granularity] || 'day';
  return `date_trunc('${gran}', "fechaDesde" AT TIME ZONE 'UTC')`;
}

/** Fallback para PG < 14 (si no tenés date_bin) — DESCOMENTAR y usar en lugar de buildBucketExpr:
function buildBucketExprFallback({ bucketDays, origin }) {
  const originIso = origin.toISOString();
  const d = Math.max(1, Math.floor(+bucketDays));
  return `
    (
      DATE_TRUNC('day', '${originIso}'::timestamptz)
      + FLOOR(EXTRACT(EPOCH FROM (("fechaDesde" AT TIME ZONE 'UTC') - '${originIso}'::timestamptz)) / (${d}*86400))
        * INTERVAL '${d} days'
    )
  `;
}
*/

// helpers de formateo
function ddmmyy(d, locale = 'es-AR') {
  // dd/MM (sin año)
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function monthLabel(d, locale = 'es-AR', short = false) {
  return d.toLocaleDateString(locale, { month: short ? 'short' : 'long', year: 'numeric', timeZone: 'UTC' });
}
function clampToEnd(d, end) {
  return (end && d > end) ? new Date(end) : d;
}
function formatBucketLabel(bucketISO, { granularity, bucketDays, end, label = 'auto', locale = 'es-AR' }) {
  const start = new Date(bucketISO);
  const hasBuckets = Number(bucketDays) > 0;

  // Elegir modo si 'auto'
  let mode = label;
  if (label === 'auto') {
    if (hasBuckets) mode = 'range';
    else if ((granularity || 'day') === 'month') mode = 'monthShort';
    else if (granularity === 'week') mode = 'weekRange';
    else mode = 'dateShort';
  }

  if (mode === 'month' || mode === 'monthShort') {
    return monthLabel(start, locale, mode === 'monthShort'); // ej: "ene 2025"
  }
  if (mode === 'date') {
    return isoDate(start); // "2025-08-13"
  }
  if (mode === 'dateShort') {
    return ddmmyy(start, locale); // "13/08"
  }
  if (mode === 'weekRange') {
    const endRange = clampToEnd(new Date(Date.UTC(
      start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 0, 0, 0
    )), end);
    return `${ddmmyy(start, locale)}–${ddmmyy(endRange, locale)}`; // "12/08–18/08"
  }
  if (mode === 'range') {
    const days = Math.max(1, Math.floor(+bucketDays || 1));
    const endRange = clampToEnd(new Date(Date.UTC(
      start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + (days - 1), 0, 0, 0
    )), end);
    return `${ddmmyy(start, locale)}–${ddmmyy(endRange, locale)}`; // "01/01–10/01"
  }
  // fallback
  return isoDate(start);
}


// -------------------- telemetría (reservas / ventas) --------------------
async function getTelemetry({ start, end, granularity, ventaBy, bucketDays, label = 'auto', locale = 'es-AR' }) {
  const dtExpr = buildBucketExpr({ granularity, bucketDays, origin: start });
  const whereAll = whereRangoSolapado(start, end);

  const reservasSeries = await Reserva.findAll({
    attributes: [
      [literal(dtExpr), 'bucket'],
      [fn('COUNT', col('idReserva')), 'count'],
    ],
    where: whereAll,
    group: [literal(dtExpr)],
    order: [literal(dtExpr)],
    raw: true,
  });

  const ventasSeries = await Reserva.findAll({
    attributes: [
      [literal(dtExpr), 'bucket'],
      [fn('COUNT', col('idReserva')), 'count'],
      [fn('COALESCE', fn('SUM', col('montoTotal')), 0), 'sum'],
    ],
    where: whereVenta(whereAll, ventaBy),
    group: [literal(dtExpr)],
    order: [literal(dtExpr)],
    raw: true,
  });

  const mapRow = (r) => {
    const bucketISO = new Date(r.bucket + 'Z').toISOString(); // inicio del bucket en UTC
    return {
      bucket: bucketISO,
      label: formatBucketLabel(bucketISO, { granularity, bucketDays, end, label, locale }),
      count: Number(r.count),
      ...(r.sum !== undefined ? { sum: Number(r.sum) } : {}),
    };
  };

  return {
    granularity: bucketDays ? `${bucketDays}d` : (granularity || 'day'),
    reservas: reservasSeries.map(mapRow),
    ventas: ventasSeries.map(mapRow),
  };
}


// -------------------- ocupación “ahora” y totales de habitaciones --------------------
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

// -------------------- endpoints --------------------
// GET /dashboard/summary
export async function getDashboardSummary(req, res, next) {
  try {
    const { from, to, granularity = 'day', ventaBy = 'pagado', bucketDays } = req.query;
    const { start, end } = normalizeRange(from, to);

    const [totals, habitacionesOcupadas, totalHabitaciones, telemetria] = await Promise.all([
      getTotals({ start, end, ventaBy }),
      getCurrentHabitacionesOcupadasCount(),
      getTotalRoomsCount(),
      getTelemetry({ start, end, granularity, ventaBy, bucketDays: bucketDays ? +bucketDays : 0 }),
    ]);

    const tasaDeOcupacion = totalHabitaciones > 0 ? (habitacionesOcupadas / totalHabitaciones) : 0;

    res.json({
      range: {
        from: start.toISOString().slice(0, 10),
        to: end.toISOString().slice(0, 10),
      },
      totals: {
        telemetria,                       // ← incluye reservas/ventas por bucket
        reservas: totals.reservasTotal,
        ventas: totals.ventasTotal,
        montoPagado: totals.montoPagado,
        montoTotal: totals.montoTotal,
        habitacionesOcupadas,
        totalHabitaciones,
        tasaDeOcupacion,                  // 0..1
        tasaDeOcupacionPct: +(tasaDeOcupacion * 100).toFixed(2),
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// GET /dashboard/telemetry  (opcional: si querés llamarlo por separado)
export async function getDashboardTelemetry(req, res, next) {
  try {
    const { from, to, granularity = 'day', ventaBy = 'pagado', bucketDays } = req.query;
    const { start, end } = normalizeRange(from, to);
    const telemetria = await getTelemetry({ start, end, granularity, ventaBy, bucketDays: bucketDays ? +bucketDays : 0 });
    res.json(telemetria);
  } catch (err) {
    next(err);
  }
}
