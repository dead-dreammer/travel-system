const db = require('../../db/pool');
const { ok, created, error, notFound, forbidden, serverError, parseBody, getUserFromEvent } = require('../../utils/response');
const { expenseClaimStatusEmail } = require('../../utils/email');

const FINANCE_ROLES = ['finance', 'finance_manager', 'admin'];

function canSeeAll(user) {
  return FINANCE_ROLES.includes(user.role);
}

async function generateClaimNumber() {
  const year = new Date().getFullYear();
  const { rows } = await db.query(
    `SELECT COUNT(*) FROM expense_claims WHERE claim_number LIKE $1`,
    [`EC-${year}-%`]
  );
  const seq = String(parseInt(rows[0].count) + 1).padStart(4, '0');
  return `EC-${year}-${seq}`;
}

async function listClaims(event, user) {
  const qs = event.queryStringParameters || {};
  const { status, page = 1, limit = 50 } = qs;

  const params = [];
  const conditions = [];

  if (!canSeeAll(user)) {
    params.push(user.employeeId);
    conditions.push(`ec.employee_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`ec.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  const { rows } = await db.query(`
    SELECT ec.*, tr.request_number, tr.destination_city, tr.destination_country,
           e.first_name, e.last_name, e.email
    FROM expense_claims ec
    LEFT JOIN travel_requests tr ON ec.request_id = tr.id
    LEFT JOIN employees e ON ec.employee_id = e.id
    ${where}
    ORDER BY ec.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const countParams = params.slice(0, -2);
  const { rows: countRows } = await db.query(`SELECT COUNT(*) FROM expense_claims ec ${where}`, countParams);

  return ok({ claims: rows, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
}

async function createClaim(body, user) {
  const { request_id, notes } = body;

  if (!request_id) return error('request_id is required');

  // Verify the trip belongs to this employee and is completed
  const { rows: reqRows } = await db.query('SELECT * FROM travel_requests WHERE id = $1', [request_id]);
  if (!reqRows.length) return notFound('Travel request');
  const req = reqRows[0];

  if (req.employee_id !== user.employeeId) return forbidden();

  // Allow claim creation once booked or completed
  if (!['booked', 'completed'].includes(req.status)) {
    return error(`Expense claims can only be submitted for booked or completed trips. Current status: ${req.status}`);
  }

  // Check for existing claim
  const { rows: existing } = await db.query(
    'SELECT id FROM expense_claims WHERE request_id = $1 AND employee_id = $2',
    [request_id, user.employeeId]
  );
  if (existing.length) return error('An expense claim already exists for this trip');

  const claimNumber = await generateClaimNumber();

  const { rows } = await db.query(`
    INSERT INTO expense_claims (request_id, employee_id, claim_number, status, notes)
    VALUES ($1, $2, $3, 'draft', $4)
    RETURNING *
  `, [request_id, user.employeeId, claimNumber, notes || null]);

  return created(rows[0]);
}

async function addExpenseItem(claimId, body, user) {
  const { rows: claimRows } = await db.query('SELECT * FROM expense_claims WHERE id = $1', [claimId]);
  if (!claimRows.length) return notFound('Expense claim');

  const claim = claimRows[0];
  if (claim.employee_id !== user.employeeId) return forbidden();
  if (!['draft', 'submitted'].includes(claim.status)) {
    return error('Items can only be added to draft or submitted claims');
  }

  const {
    category, description, expense_date, amount_original,
    currency, exchange_rate, receipt_url, is_per_diem,
  } = body;

  if (!category || !expense_date) return error('Required: category, expense_date');

  let amountZar = amount_original;
  let finalExchangeRate = exchange_rate || 1;

  // Auto-populate per diem amount
  if (is_per_diem && category === 'meals') {
    const { rows: reqRows } = await db.query('SELECT * FROM travel_requests WHERE id = $1', [claim.request_id]);
    if (reqRows.length) {
      const { destination_country, destination_city } = reqRows[0];
      const { rows: rateRows } = await db.query(`
        SELECT rate_zar FROM per_diem_rates
        WHERE country = $1
          AND (city = $2 OR city IS NULL)
        ORDER BY city DESC NULLS LAST
        LIMIT 1
      `, [destination_country, destination_city]);

      if (rateRows.length) {
        amountZar = rateRows[0].rate_zar;
        finalExchangeRate = 1;
      }
    }
  } else if (currency && currency !== 'ZAR' && exchange_rate) {
    amountZar = parseFloat(amount_original) * parseFloat(exchange_rate);
  }

  const { rows } = await db.query(`
    INSERT INTO expense_items (
      claim_id, category, description, expense_date,
      amount_original, currency, exchange_rate, amount_zar,
      receipt_url, is_per_diem
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `, [
    claimId, category, description || null, expense_date,
    amount_original || amountZar, currency || 'ZAR', finalExchangeRate, amountZar,
    receipt_url || null, is_per_diem || false,
  ]);

  // Recalculate claim total
  await db.query(`
    UPDATE expense_claims
    SET total_zar = (SELECT COALESCE(SUM(amount_zar), 0) FROM expense_items WHERE claim_id = $1)
    WHERE id = $1
  `, [claimId]);

  return created(rows[0]);
}

async function submitClaim(claimId, user) {
  const { rows: claimRows } = await db.query('SELECT * FROM expense_claims WHERE id = $1', [claimId]);
  if (!claimRows.length) return notFound('Expense claim');

  const claim = claimRows[0];
  if (claim.employee_id !== user.employeeId) return forbidden();
  if (claim.status !== 'draft') return error('Only draft claims can be submitted');

  const { rows: itemRows } = await db.query('SELECT COUNT(*) FROM expense_items WHERE claim_id = $1', [claimId]);
  if (parseInt(itemRows[0].count) === 0) return error('Cannot submit an empty claim — add expense items first');

  const { rows } = await db.query(`
    UPDATE expense_claims
    SET status = 'submitted', submission_date = CURRENT_DATE
    WHERE id = $1
    RETURNING *
  `, [claimId]);

  return ok({ message: 'Expense claim submitted for approval', claim: rows[0] });
}

async function approveClaim(claimId, user) {
  if (!canSeeAll(user)) return forbidden();

  const { rows: claimRows } = await db.query('SELECT * FROM expense_claims WHERE id = $1', [claimId]);
  if (!claimRows.length) return notFound('Expense claim');
  if (claimRows[0].status !== 'submitted') return error('Only submitted claims can be approved');

  const { rows } = await db.query(`
    UPDATE expense_claims
    SET status = 'approved', approval_date = CURRENT_DATE
    WHERE id = $1
    RETURNING *
  `, [claimId]);

  const { rows: empRows } = await db.query('SELECT * FROM employees WHERE id = $1', [rows[0].employee_id]);
  if (empRows.length) {
    await expenseClaimStatusEmail(empRows[0], rows[0], 'approved').catch(console.error);
  }

  return ok({ message: 'Expense claim approved', claim: rows[0] });
}

async function rejectClaim(claimId, body, user) {
  if (!canSeeAll(user)) return forbidden();

  const { reason } = body;
  if (!reason) return error('A rejection reason is required');

  const { rows: claimRows } = await db.query('SELECT * FROM expense_claims WHERE id = $1', [claimId]);
  if (!claimRows.length) return notFound('Expense claim');
  if (claimRows[0].status !== 'submitted') return error('Only submitted claims can be rejected');

  const { rows } = await db.query(`
    UPDATE expense_claims SET status = 'rejected', notes = CONCAT(COALESCE(notes, ''), ' | Rejected: ', $2) WHERE id = $1 RETURNING *
  `, [claimId, reason]);

  const { rows: empRows } = await db.query('SELECT * FROM employees WHERE id = $1', [rows[0].employee_id]);
  if (empRows.length) {
    await expenseClaimStatusEmail(empRows[0], rows[0], 'rejected', reason).catch(console.error);
  }

  return ok({ message: 'Expense claim rejected', claim: rows[0] });
}

async function getPerDiemRates(event) {
  const qs = event.queryStringParameters || {};
  const { country } = qs;
  const params = [];
  let where = '';
  if (country) {
    params.push(`%${country}%`);
    where = 'WHERE country ILIKE $1';
  }
  const { rows } = await db.query(`SELECT * FROM per_diem_rates ${where} ORDER BY country, city`, params);
  return ok(rows);
}

exports.handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const method = event.httpMethod;
    const proxy = event.pathParameters?.proxy || '';
    const parts = proxy.split('/').filter(Boolean);
    const [idOrSub, action] = parts;

    if (method === 'OPTIONS') return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: '' };

    // GET /expenses/per-diem-rates
    if (method === 'GET' && idOrSub === 'per-diem-rates') return getPerDiemRates(event);
    // GET /expenses
    if (method === 'GET' && !idOrSub) return listClaims(event, user);
    // POST /expenses
    if (method === 'POST' && !idOrSub) return createClaim(parseBody(event), user);
    // POST /expenses/{id}/items
    if (method === 'POST' && idOrSub && action === 'items') return addExpenseItem(idOrSub, parseBody(event), user);
    // PUT /expenses/{id}/submit
    if (method === 'PUT' && idOrSub && action === 'submit') return submitClaim(idOrSub, user);
    // POST /expenses/{id}/approve
    if (method === 'POST' && idOrSub && action === 'approve') return approveClaim(idOrSub, user);
    // POST /expenses/{id}/reject
    if (method === 'POST' && idOrSub && action === 'reject') return rejectClaim(idOrSub, parseBody(event), user);

    return error('Method not allowed', 405);
  } catch (err) {
    return serverError(err);
  }
};
