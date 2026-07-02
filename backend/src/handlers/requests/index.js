const db = require('../../db/pool');
const { ok, created, error, notFound, forbidden, serverError, parseBody, getUserFromEvent } = require('../../utils/response');

const COORDINATOR_ROLES = ['travel_coordinator', 'admin'];

function canSeeAll(user) {
  return COORDINATOR_ROLES.includes(user.role);
}

// Generate request number: TR-YYYY-NNNN
async function generateRequestNumber() {
  const year = new Date().getFullYear();
  const { rows } = await db.query(
    `SELECT COUNT(*) FROM travel_requests WHERE request_number LIKE $1`,
    [`TR-${year}-%`]
  );
  const seq = String(parseInt(rows[0].count) + 1).padStart(4, '0');
  return `TR-${year}-${seq}`;
}

// Fetch the applicable travel policy for an employee's tier
async function getPolicyForEmployee(employeeId) {
  const { rows: empRows } = await db.query(
    'SELECT travel_tier FROM employees WHERE id = $1',
    [employeeId]
  );
  const tier = empRows[0]?.travel_tier || 'standard';

  const { rows } = await db.query(
    `SELECT * FROM travel_policies WHERE applies_to = $1 OR applies_to = 'all' ORDER BY applies_to DESC LIMIT 1`,
    [`tier:${tier}`]
  );
  return rows[0] || null;
}

// Check for policy violations and return an array of warnings
function checkPolicyViolations(body, policy) {
  if (!policy) return [];
  const warnings = [];
  const { departure_date, estimated_cost_zar } = body;

  if (departure_date) {
    const daysUntilDeparture = Math.floor(
      (new Date(departure_date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDeparture < policy.advance_booking_days) {
      warnings.push(`Late booking: policy requires ${policy.advance_booking_days} days advance notice`);
    }
  }

  if (estimated_cost_zar && parseFloat(estimated_cost_zar) > parseFloat(policy.requires_approval_above_zar)) {
    warnings.push(`Estimated cost R${estimated_cost_zar} exceeds approval threshold R${policy.requires_approval_above_zar}`);
  }

  return warnings;
}

async function listRequests(event, user) {
  const qs = event.queryStringParameters || {};
  const { status, trip_type, from_date, to_date, page = 1, limit = 50 } = qs;

  const params = [];
  const conditions = [];

  if (!canSeeAll(user)) {
    params.push(user.employeeId);
    conditions.push(`tr.employee_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`tr.status = $${params.length}`);
  }
  if (trip_type) {
    params.push(trip_type);
    conditions.push(`tr.trip_type = $${params.length}`);
  }
  if (from_date) {
    params.push(from_date);
    conditions.push(`tr.departure_date >= $${params.length}`);
  }
  if (to_date) {
    params.push(to_date);
    conditions.push(`tr.return_date <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  const { rows } = await db.query(`
    SELECT tr.*,
           e.first_name, e.last_name, e.email, e.department_name
    FROM travel_requests tr
    LEFT JOIN employees e ON tr.employee_id = e.id
    ${where}
    ORDER BY tr.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const countParams = params.slice(0, -2);
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FROM travel_requests tr ${where}`,
    countParams
  );

  return ok({ requests: rows, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
}

async function getRequest(id, user) {
  const { rows } = await db.query(`
    SELECT tr.*,
           e.first_name, e.last_name, e.email, e.department_name, e.travel_tier
    FROM travel_requests tr
    LEFT JOIN employees e ON tr.employee_id = e.id
    WHERE tr.id = $1
  `, [id]);

  if (!rows.length) return notFound('Travel request');
  const req = rows[0];

  if (!canSeeAll(user) && req.employee_id !== user.employeeId) return forbidden();

  // Fetch related records
  const [approvals, flights, accommodation, cars, expenses] = await Promise.all([
    db.query('SELECT * FROM travel_approvals WHERE request_id = $1 ORDER BY created_at', [id]),
    db.query('SELECT * FROM flight_bookings WHERE request_id = $1 ORDER BY departure_datetime', [id]),
    db.query('SELECT * FROM accommodation_bookings WHERE request_id = $1 ORDER BY check_in', [id]),
    db.query('SELECT * FROM car_hire_bookings WHERE request_id = $1', [id]),
    db.query('SELECT * FROM expense_claims WHERE request_id = $1', [id]),
  ]);

  return ok({
    ...req,
    approvals: approvals.rows,
    flight_bookings: flights.rows,
    accommodation_bookings: accommodation.rows,
    car_hire_bookings: cars.rows,
    expense_claims: expenses.rows,
  });
}

async function createRequest(body, user) {
  const {
    trip_type, purpose, destination_city, destination_country,
    departure_date, return_date, estimated_cost_zar, priority, notes,
  } = body;

  if (!trip_type || !purpose || !destination_city || !departure_date || !return_date) {
    return error('Required fields: trip_type, purpose, destination_city, departure_date, return_date');
  }

  if (new Date(return_date) < new Date(departure_date)) {
    return error('return_date must be on or after departure_date');
  }

  const employeeId = user.employeeId;
  const requestNumber = await generateRequestNumber();
  const policy = await getPolicyForEmployee(employeeId);
  const policyWarnings = checkPolicyViolations(body, policy);

  const { rows } = await db.query(`
    INSERT INTO travel_requests (
      request_number, employee_id, trip_type, purpose,
      destination_city, destination_country,
      departure_date, return_date, estimated_cost_zar,
      priority, notes, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
    RETURNING *
  `, [
    requestNumber, employeeId, trip_type, purpose,
    destination_city, destination_country || 'South Africa',
    departure_date, return_date, estimated_cost_zar || null,
    priority || 'normal', notes || null,
  ]);

  const req = rows[0];

  // Create initial approval record for line manager
  await db.query(`
    INSERT INTO travel_approvals (request_id, approver_role, status)
    VALUES ($1, 'line_manager', 'pending')
  `, [req.id]);

  return created({ ...req, policy_warnings: policyWarnings });
}

async function updateRequest(id, body, user) {
  const { rows: existing } = await db.query('SELECT * FROM travel_requests WHERE id = $1', [id]);
  if (!existing.length) return notFound('Travel request');

  const req = existing[0];
  if (req.employee_id !== user.employeeId) return forbidden();
  if (req.status !== 'pending') return error('Only pending requests can be edited');

  const allowed = [
    'purpose', 'destination_city', 'destination_country',
    'departure_date', 'return_date', 'estimated_cost_zar',
    'priority', 'notes', 'trip_type',
  ];

  const updates = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([k, _], i) => `${k} = $${i + 2}`);

  if (!updates.length) return error('No valid fields to update');

  const values = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([, v]) => v);

  const { rows } = await db.query(
    `UPDATE travel_requests SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  return ok(rows[0]);
}

async function cancelRequest(id, user) {
  const { rows: existing } = await db.query('SELECT * FROM travel_requests WHERE id = $1', [id]);
  if (!existing.length) return notFound('Travel request');

  const req = existing[0];
  if (req.employee_id !== user.employeeId && !canSeeAll(user)) return forbidden();

  const cancellableStatuses = ['pending', 'manager_approved'];
  if (!cancellableStatuses.includes(req.status)) {
    return error(`Cannot cancel a request with status '${req.status}'`);
  }

  const { rows } = await db.query(
    `UPDATE travel_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  return ok({ message: 'Travel request cancelled', request: rows[0] });
}

exports.handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const method = event.httpMethod;
    const proxy = event.pathParameters?.proxy || '';
    const id = proxy.split('/').filter(Boolean)[0];

    if (method === 'OPTIONS') return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' }, body: '' };
    if (method === 'GET' && !id) return listRequests(event, user);
    if (method === 'GET' && id) return getRequest(id, user);
    if (method === 'POST' && !id) return createRequest(parseBody(event), user);
    if (method === 'PUT' && id) return updateRequest(id, parseBody(event), user);
    if (method === 'DELETE' && id) return cancelRequest(id, user);

    return error('Method not allowed', 405);
  } catch (err) {
    return serverError(err);
  }
};
