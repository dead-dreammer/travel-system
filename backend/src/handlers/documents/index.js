const db = require('../../db/pool');
const { ok, created, error, notFound, forbidden, serverError, parseBody, getUserFromEvent } = require('../../utils/response');

const COORDINATOR_ROLES = ['travel_coordinator', 'admin', 'hr_manager'];

function canSeeAll(user) {
  return COORDINATOR_ROLES.includes(user.role);
}

async function listDocuments(event, user) {
  const qs = event.queryStringParameters || {};
  const { employee_id, document_type, status } = qs;

  const params = [];
  const conditions = [];

  if (!canSeeAll(user)) {
    params.push(user.employeeId);
    conditions.push(`td.employee_id = $${params.length}`);
  } else if (employee_id) {
    params.push(employee_id);
    conditions.push(`td.employee_id = $${params.length}`);
  }

  if (document_type) {
    params.push(document_type);
    conditions.push(`td.document_type = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`td.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(`
    SELECT td.*, e.first_name, e.last_name, e.email, e.employee_number
    FROM travel_documents td
    LEFT JOIN employees e ON td.employee_id = e.id
    ${where}
    ORDER BY td.expiry_date ASC NULLS LAST
  `, params);

  return ok(rows);
}

async function addDocument(body, user) {
  const {
    employee_id, document_type, document_number, issuing_country,
    issue_date, expiry_date, visa_countries, document_url,
  } = body;

  // Employees can add their own docs; coordinators can add for anyone
  const targetEmployeeId = canSeeAll(user) && employee_id ? employee_id : user.employeeId;

  if (!document_type) return error('document_type is required');

  const { rows } = await db.query(`
    INSERT INTO travel_documents (
      employee_id, document_type, document_number, issuing_country,
      issue_date, expiry_date, visa_countries, document_url, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')
    RETURNING *
  `, [
    targetEmployeeId, document_type, document_number, issuing_country,
    issue_date || null, expiry_date || null,
    visa_countries || null, document_url || null,
  ]);

  return created(rows[0]);
}

async function updateDocument(id, body, user) {
  const { rows: existing } = await db.query('SELECT * FROM travel_documents WHERE id = $1', [id]);
  if (!existing.length) return notFound('Document');

  const doc = existing[0];
  if (doc.employee_id !== user.employeeId && !canSeeAll(user)) return forbidden();

  const allowed = [
    'document_number', 'issuing_country', 'issue_date',
    'expiry_date', 'visa_countries', 'document_url', 'status',
  ];

  const updates = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([k, _], i) => `${k} = $${i + 2}`);

  if (!updates.length) return error('No valid fields to update');

  const values = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([, v]) => v);

  const { rows } = await db.query(
    `UPDATE travel_documents SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  return ok(rows[0]);
}

async function getExpiringDocuments(event, user) {
  if (!canSeeAll(user)) return forbidden();

  const qs = event.queryStringParameters || {};
  const days = parseInt(qs.days || '90');

  const { rows } = await db.query(`
    SELECT td.*, e.first_name, e.last_name, e.email, e.employee_number, e.department_name,
           (td.expiry_date - CURRENT_DATE) AS days_until_expiry
    FROM travel_documents td
    JOIN employees e ON td.employee_id = e.id
    WHERE td.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
      AND td.status = 'active'
    ORDER BY td.expiry_date ASC
  `);

  return ok(rows);
}

async function listVisaRequirements(event) {
  const qs = event.queryStringParameters || {};
  const { destination_country, passport_country } = qs;

  const params = [];
  const conditions = [];

  if (destination_country) {
    params.push(`%${destination_country}%`);
    conditions.push(`vr.destination_country ILIKE $${params.length}`);
  }
  if (passport_country) {
    params.push(passport_country);
    conditions.push(`vr.passport_country = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT * FROM visa_requirements vr ${where} ORDER BY destination_country`,
    params
  );

  return ok(rows);
}

exports.handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const method = event.httpMethod;
    const proxy = event.pathParameters?.proxy || '';
    const parts = proxy.split('/').filter(Boolean);
    const [idOrSub] = parts;

    if (method === 'OPTIONS') return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: '' };

    // GET /documents/expiring
    if (method === 'GET' && idOrSub === 'expiring') return getExpiringDocuments(event, user);
    // GET /documents
    if (method === 'GET' && !idOrSub) return listDocuments(event, user);
    // POST /documents
    if (method === 'POST' && !idOrSub) return addDocument(parseBody(event), user);
    // PUT /documents/{id}
    if (method === 'PUT' && idOrSub) return updateDocument(idOrSub, parseBody(event), user);

    return error('Method not allowed', 405);
  } catch (err) {
    return serverError(err);
  }
};

// Separate handler for /visa-requirements route
exports.visaHandler = async (event) => {
  try {
    const method = event.httpMethod;
    if (method === 'OPTIONS') return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,OPTIONS' }, body: '' };
    if (method === 'GET') return listVisaRequirements(event);
    return error('Method not allowed', 405);
  } catch (err) {
    return serverError(err);
  }
};
