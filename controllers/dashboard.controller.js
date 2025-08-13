// controllers/dashboard.controller.js (ESM)
import { Op, fn, col /*, literal*/ } from 'sequelize';
import { Reserva } from '../models/index.js'; // ajustá el path si hace falta

const GRAN_MAP = { day: 'day', week: 'week', month: 'month' };

// Si querés usar estados específicos como “venta”, ponelos acá, ej: [2, 3]
const ESTADOS_VENTA_IDS = []; // ← completa si usás ventaBy=estado

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
  const end   = new Date(Date.UTC(to.getFullYear(),   to.getMonth(),   to.getDate(),   23, 59, 59));
  return { start, end };
}

// --- helpers de filtro ---
function whereRangoSolapado(start, end) {
  // fechaDesde <= end  AND  fechaHasta >= start
  return {
    fechaDesde: { [Op.lte]: end },
    fechaHasta: { [Op.gte]: start }
  };
}

function whereVenta(baseWhere, ventaBy) {
  if (ventaBy === 'estado' && ESTADOS_VENTA_IDS.length) {
    return { ...baseWhere, idEstadoReserva: { [Op.in]: ESTADOS_VENTA_IDS } };
  }
  // default: hay “venta” si hubo pago
  return { ...baseWhere, montoPagado: { [Op.gt]: 0 } };
}

// ============ Totales ============
async function getTotals({ start, end, ventaBy }) {
  const whereAll = whereRangoSolapado(start, end);
  const reservasTotal = await Reserva.count({ where: whereAll });

  // ventas = count de reservas que cumplen la condición de venta (pagado>0 o estado IN (...))
  // montoTotal = SUM(montoTotal) de esas mismas reservas
  // montoPagado = SUM(montoPagado) (por si querés mostrarlo)
  const [agg] = await Reserva.findAll({
    attributes: [
      [fn('COUNT', col('idReserva')), 'ventas'],
      [fn('COALESCE', fn('SUM', col('montoTotal')), 0), 'montoTotal'],
      [fn('COALESCE', fn('SUM', col('montoPagado')), 0), 'montoPagado'],
    ],
    where: whereVenta(whereAll, ventaBy),
    raw: true
  });

  return {
    reservasTotal,
    ventasTotal: Number(agg?.ventas || 0),
    montoPagado: Number(agg?.montoPagado || 0),  // opcional, por si lo usás en el front
    montoTotal:  Number(agg?.montoTotal || 0),   // ← SUM(montoTotal)
  };
}

/* ================= Telemetría (comentada) =================
function buildDateTrunc(granularity) {
  const gran = GRAN_MAP[granularity] || 'day';
  // Telemetría por inicio de estadía
  return `date_trunc('${gran}', "fechaDesde" AT TIME ZONE 'UTC')`;
}

async function getTelemetry({ start, end, granularity, ventaBy }) {
  const dt = buildDateTrunc(granularity);
  const whereAll = whereRangoSolapado(start, end);

  const reservasSeries = await Reserva.findAll({
    attributes: [
      [literal(dt), 'bucket'],
      [fn('COUNT', col('idReserva')), 'count']
    ],
    where: whereAll,
    group: [literal(dt)],
    order: [literal(dt)],
    raw: true
  });

  const ventasSeries = await Reserva.findAll({
    attributes: [
      [literal(dt), 'bucket'],
      [fn('COUNT', col('idReserva')), 'count'],
      [fn('COALESCE', fn('SUM', col('montoTotal')), 0), 'sum']
    ],
    where: whereVenta(whereAll, ventaBy),
    group: [literal(dt)],
    order: [literal(dt)],
    raw: true
  });

  const mapRow = r => ({
    bucket: new Date(r.bucket + 'Z').toISOString(),
    count: Number(r.count),
    sum: r.sum !== undefined ? Number(r.sum) : undefined
  });

  return {
    granularity,
    reservas: reservasSeries.map(mapRow).map(({ bucket, count }) => ({ bucket, count })),
    ventas:   ventasSeries.map(mapRow)
  };
}
=========================================================== */

export async function getDashboardSummary(req, res, next) {
  try {
    const { from, to, /*telemetry = 'false',*/ granularity = 'day', ventaBy = 'pagado' } = req.query;
    const { start, end } = normalizeRange(from, to);

    const totals = await getTotals({ start, end, ventaBy });
    // const telem = telemetry === 'true'
    //   ? await getTelemetry({ start, end, granularity, ventaBy })
    //   : null;

    res.json({
      range: {
        from: start.toISOString().slice(0, 10),
        to:   end.toISOString().slice(0, 10)
      },
      totals: {
        reservas:   totals.reservasTotal,
        ventas:     totals.ventasTotal,
        montoPagado: totals.montoPagado, // opcional
        montoTotal: totals.montoTotal,   // ← usando montoTotal
      },
      
    });
  } catch (err) {
    next(err);
  }
}
