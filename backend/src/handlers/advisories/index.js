const db = require('../../db/pool');
const {
  ok, created, error, notFound, forbidden, serverError,
  parseBody, getPathParam, getUserFromEvent,
} = require('../../utils/response');

const COORDINATOR_ROLES = ['travel_coordinator', 'admin'];

// Severity order for sorting: do_not_travel first
const LEVEL_ORDER = `CASE level
  WHEN 'do_not_travel' THEN 1
  WHEN 'high_risk'     THEN 2
  WHEN 'caution'       THEN 3
  WHEN 'safe'          THEN 4
  ELSE 5
END`;

function canManage(user) {
  return COORDINATOR_ROLES.includes(user.role);
}

async function listAdvisories(event) {
  const qs = event.queryStringParameters || {};
  const { country, city } = qs;

  const params = [];
  const conditions = ['status = $1'];
  params.push('active');

  if (country) {
    params.push(country);
    conditions.push(`country ILIKE $${params.length}`);
  }
  if (city) {
    params.push(`%${city}%`);
    conditions.push(`city ILIKE $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const { rows } = await db.query(`
    SELECT * FROM travel_advisories
    ${where}
    ORDER BY ${LEVEL_ORDER}, created_at DESC
  `, params);

  return ok({ advisories: rows, total: rows.length });
}

async function getAdvisory(id) {
  const { rows } = await db.query('SELECT * FROM travel_advisories WHERE id = $1', [id]);
  if (!rows.length) return notFound('Advisory');
  return ok(rows[0]);
}

async function createAdvisory(body, user) {
  if (!canManage(user)) return forbidden();

  const { country, city, level, title, description, issued_by, valid_until } = body;

  if (!country || !level || !title || !description) {
    return error('Required fields: country, level, title, description');
  }

  const validLevels = ['safe', 'caution', 'high_risk', 'do_not_travel'];
  if (!validLevels.includes(level)) {
    return error(`level must be one of: ${validLevels.join(', ')}`);
  }

  const { rows } = await db.query(`
    INSERT INTO travel_advisories
      (country, city, level, title, description, issued_by, valid_until, status, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
    RETURNING *
  `, [
    country,
    city || null,
    level,
    title,
    description,
    issued_by || user.email,
    valid_until || null,
    user.employeeId,
  ]);

  return created(rows[0]);
}

async function updateAdvisory(id, body, user) {
  if (!canManage(user)) return forbidden();

  const { rows: existing } = await db.query('SELECT * FROM travel_advisories WHERE id = $1', [id]);
  if (!existing.length) return notFound('Advisory');

  const allowed = ['country', 'city', 'level', 'title', 'description', 'issued_by', 'valid_until', 'status'];
  const entries = Object.entries(body).filter(([k]) => allowed.includes(k));

  if (!entries.length) return error('No valid fields to update');

  const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = entries.map(([, v]) => v);

  const { rows } = await db.query(
    `UPDATE travel_advisories SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  return ok(rows[0]);
}

async function deleteAdvisory(id, user) {
  if (!canManage(user)) return forbidden();

  const { rows: existing } = await db.query('SELECT * FROM travel_advisories WHERE id = $1', [id]);
  if (!existing.length) return notFound('Advisory');

  await db.query(
    `UPDATE travel_advisories SET status = 'archived', updated_at = NOW() WHERE id = $1`,
    [id]
  );

  return ok({ message: 'Advisory deleted (archived)', id });
}

exports.handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const method = event.httpMethod;
    const proxy = event.pathParameters?.proxy || '';
    const id = proxy.split('/').filter(Boolean)[0];

    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: '',
      };
    }

    if (method === 'GET' && !id) return listAdvisories(event);
    if (method === 'GET' && id) return getAdvisory(id);
    if (method === 'POST' && !id) return createAdvisory(parseBody(event), user);
    if (method === 'PUT' && id) return updateAdvisory(id, parseBody(event), user);
    if (method === 'DELETE' && id) return deleteAdvisory(id, user);

    return error('Method not allowed', 405);
  } catch (err) {
    return serverError(err);
  }
};
