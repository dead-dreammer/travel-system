const db = require('../../db/pool');
const {
  ok, error, forbidden, serverError, getUserFromEvent,
} = require('../../utils/response');

const ALLOWED_ROLES = ['travel_coordinator', 'finance', 'admin'];

function canAccess(user) {
  return ALLOWED_ROLES.includes(user.role);
}

async function spendReport() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // YTD totals — sum actual booking costs, fallback to estimated_cost_zar
  const { rows: ytdRows } = await db.query(`
    SELECT
      COUNT(tr.id)::int                                                      AS total_trips_ytd,
      COALESCE(SUM(
        COALESCE(fb.total_cost, 0) + COALESCE(ab.total_cost, 0)
      ), SUM(COALESCE(tr.estimated_cost_zar, 0)))                            AS total_spend_ytd
    FROM travel_requests tr
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM flight_bookings WHERE request_id = tr.id
    ) fb ON true
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM accommodation_bookings WHERE request_id = tr.id
    ) ab ON true
    WHERE tr.departure_date >= $1
      AND tr.status NOT IN ('cancelled', 'rejected')
  `, [startOfYear.toISOString().split('T')[0]]);

  const totalSpendYtd = parseFloat(ytdRows[0]?.total_spend_ytd || 0);
  const totalTripsYtd = ytdRows[0]?.total_trips_ytd || 0;
  const avgTripCost = totalTripsYtd > 0 ? totalSpendYtd / totalTripsYtd : 0;

  // By department
  const { rows: byDept } = await db.query(`
    SELECT
      e.department_name                                                       AS department,
      COUNT(tr.id)::int                                                       AS trips,
      COALESCE(SUM(
        COALESCE(fb.total_cost, 0) + COALESCE(ab.total_cost, 0)
      ), SUM(COALESCE(tr.estimated_cost_zar, 0)))                            AS spend
    FROM travel_requests tr
    LEFT JOIN employees e ON tr.employee_id = e.id
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM flight_bookings WHERE request_id = tr.id
    ) fb ON true
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM accommodation_bookings WHERE request_id = tr.id
    ) ab ON true
    WHERE tr.departure_date >= $1
      AND tr.status NOT IN ('cancelled', 'rejected')
    GROUP BY e.department_name
    ORDER BY spend DESC
  `, [startOfYear.toISOString().split('T')[0]]);

  // By month (last 6 months)
  const { rows: byMonth } = await db.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', tr.departure_date), 'YYYY-MM')            AS month,
      COUNT(tr.id)::int                                                       AS trips,
      COALESCE(SUM(
        COALESCE(fb.total_cost, 0) + COALESCE(ab.total_cost, 0)
      ), SUM(COALESCE(tr.estimated_cost_zar, 0)))                            AS spend
    FROM travel_requests tr
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM flight_bookings WHERE request_id = tr.id
    ) fb ON true
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM accommodation_bookings WHERE request_id = tr.id
    ) ab ON true
    WHERE tr.departure_date >= $1
      AND tr.status NOT IN ('cancelled', 'rejected')
    GROUP BY DATE_TRUNC('month', tr.departure_date)
    ORDER BY month ASC
  `, [sixMonthsAgo.toISOString().split('T')[0]]);

  // By trip type
  const { rows: byType } = await db.query(`
    SELECT
      tr.trip_type,
      COUNT(tr.id)::int                                                       AS trips,
      COALESCE(SUM(
        COALESCE(fb.total_cost, 0) + COALESCE(ab.total_cost, 0)
      ), SUM(COALESCE(tr.estimated_cost_zar, 0)))                            AS spend
    FROM travel_requests tr
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM flight_bookings WHERE request_id = tr.id
    ) fb ON true
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM accommodation_bookings WHERE request_id = tr.id
    ) ab ON true
    WHERE tr.departure_date >= $1
      AND tr.status NOT IN ('cancelled', 'rejected')
    GROUP BY tr.trip_type
    ORDER BY spend DESC
  `, [startOfYear.toISOString().split('T')[0]]);

  return ok({
    total_spend_ytd: totalSpendYtd,
    total_trips_ytd: totalTripsYtd,
    avg_trip_cost: Math.round(avgTripCost * 100) / 100,
    by_department: byDept,
    by_month: byMonth,
    by_type: byType,
  });
}

async function destinationsReport() {
  const { rows } = await db.query(`
    SELECT
      tr.destination_city,
      tr.destination_country,
      COUNT(tr.id)::int                                                       AS trips,
      COALESCE(SUM(
        COALESCE(fb.total_cost, 0) + COALESCE(ab.total_cost, 0)
      ), SUM(COALESCE(tr.estimated_cost_zar, 0)))                            AS spend
    FROM travel_requests tr
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM flight_bookings WHERE request_id = tr.id
    ) fb ON true
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM accommodation_bookings WHERE request_id = tr.id
    ) ab ON true
    WHERE tr.status NOT IN ('cancelled', 'rejected')
    GROUP BY tr.destination_city, tr.destination_country
    ORDER BY trips DESC
  `);

  return ok({ destinations: rows });
}

async function complianceReport() {
  // Pull from policy_violations column on travel_requests (JSON array of warning strings)
  const { rows } = await db.query(`
    SELECT
      tr.id,
      tr.request_number,
      tr.departure_date,
      tr.destination_city,
      tr.destination_country,
      tr.status,
      tr.policy_violations,
      e.first_name,
      e.last_name,
      e.email,
      e.department_name
    FROM travel_requests tr
    LEFT JOIN employees e ON tr.employee_id = e.id
    WHERE tr.policy_violations IS NOT NULL
      AND tr.policy_violations != '[]'
      AND tr.policy_violations::text != 'null'
    ORDER BY tr.created_at DESC
  `);

  const violations = rows.map((r) => ({
    ...r,
    policy_violations: Array.isArray(r.policy_violations)
      ? r.policy_violations
      : JSON.parse(r.policy_violations || '[]'),
  }));

  return ok({
    violations,
    total_violations: violations.length,
  });
}

async function employeesReport() {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

  const { rows } = await db.query(`
    SELECT
      tr.employee_id,
      e.first_name,
      e.last_name,
      e.email,
      e.department_name,
      COUNT(tr.id)::int                                                       AS total_trips,
      COUNT(tr.id) FILTER (WHERE tr.departure_date >= $1)::int               AS trips_ytd,
      COALESCE(SUM(
        COALESCE(fb.total_cost, 0) + COALESCE(ab.total_cost, 0)
      ), SUM(COALESCE(tr.estimated_cost_zar, 0)))                            AS total_spend,
      COALESCE(SUM(
        CASE WHEN tr.departure_date >= $1
          THEN COALESCE(fb.total_cost, 0) + COALESCE(ab.total_cost, 0)
          ELSE COALESCE(tr.estimated_cost_zar, 0)
        END
      ), 0)                                                                   AS spend_ytd
    FROM travel_requests tr
    LEFT JOIN employees e ON tr.employee_id = e.id
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM flight_bookings WHERE request_id = tr.id
    ) fb ON true
    LEFT JOIN LATERAL (
      SELECT SUM(total_cost_zar) AS total_cost FROM accommodation_bookings WHERE request_id = tr.id
    ) ab ON true
    WHERE tr.status NOT IN ('cancelled', 'rejected')
    GROUP BY tr.employee_id, e.first_name, e.last_name, e.email, e.department_name
    ORDER BY trips_ytd DESC, total_spend DESC
    LIMIT 100
  `, [startOfYear]);

  return ok({ employees: rows });
}

exports.handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    if (!canAccess(user)) return forbidden();

    const method = event.httpMethod;
    const path = event.path || event.resource || '';

    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
        },
        body: '',
      };
    }

    if (method !== 'GET') return error('Method not allowed', 405);

    if (path.includes('/reports/spend'))        return spendReport();
    if (path.includes('/reports/destinations')) return destinationsReport();
    if (path.includes('/reports/compliance'))   return complianceReport();
    if (path.includes('/reports/employees'))    return employeesReport();

    return error('Not found', 404);
  } catch (err) {
    return serverError(err);
  }
};
