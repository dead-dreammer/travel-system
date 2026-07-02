const db = require('../../db/pool');
const { ok, error, notFound, forbidden, serverError, parseBody, getUserFromEvent } = require('../../utils/response');
const { travelRequestStatusEmail, approvalRequestEmail, sendEmail } = require('../../utils/email');

// Approval chain: pending → manager_approved → travel_approved → finance_approved → booked
const STATUS_CHAIN = {
  line_manager:        { from: 'pending',           to: 'manager_approved',  next_role: 'travel_coordinator' },
  travel_coordinator:  { from: 'manager_approved',  to: 'travel_approved',   next_role: 'finance' },
  finance:             { from: 'travel_approved',   to: 'finance_approved',  next_role: null },
};

// Finance approval is only required above the policy threshold
const FINANCE_THRESHOLD_ZAR = 5000;

function getApproverRole(user) {
  if (user.role === 'line_manager' || user.role === 'manager') return 'line_manager';
  if (user.role === 'travel_coordinator') return 'travel_coordinator';
  if (user.role === 'finance' || user.role === 'finance_manager') return 'finance';
  if (user.role === 'admin') return 'travel_coordinator'; // admins can act as coordinator
  return null;
}

async function listPendingApprovals(event, user) {
  const approverRole = getApproverRole(user);
  if (!approverRole) return forbidden();

  const { rows } = await db.query(`
    SELECT ta.*, tr.request_number, tr.trip_type, tr.destination_city, tr.destination_country,
           tr.departure_date, tr.return_date, tr.estimated_cost_zar, tr.purpose, tr.priority, tr.status,
           e.first_name, e.last_name, e.email, e.department_name
    FROM travel_approvals ta
    JOIN travel_requests tr ON ta.request_id = tr.id
    LEFT JOIN employees e ON tr.employee_id = e.id
    WHERE ta.approver_role = $1
      AND ta.status = 'pending'
      AND tr.status NOT IN ('rejected', 'cancelled')
    ORDER BY tr.priority DESC, tr.created_at ASC
  `, [approverRole]);

  return ok(rows);
}

async function approveRequest(id, body, user) {
  const { comments } = body;
  const approverRole = getApproverRole(user);
  if (!approverRole) return forbidden();

  // Load the approval record
  const { rows: approvalRows } = await db.query(
    'SELECT * FROM travel_approvals WHERE id = $1',
    [id]
  );
  if (!approvalRows.length) return notFound('Approval record');

  const approval = approvalRows[0];
  if (approval.status !== 'pending') return error('This approval has already been actioned');
  if (approval.approver_role !== approverRole) return error(`This approval requires role: ${approval.approver_role}`, 403);

  const chain = STATUS_CHAIN[approverRole];
  if (!chain) return error('Unrecognised approver role');

  // Load the travel request
  const { rows: reqRows } = await db.query('SELECT * FROM travel_requests WHERE id = $1', [approval.request_id]);
  if (!reqRows.length) return notFound('Travel request');
  const req = reqRows[0];

  if (req.status !== chain.from) {
    return error(`Request is in status '${req.status}', expected '${chain.from}'`);
  }

  await db.transaction(async (client) => {
    // Mark this approval step as approved
    await client.query(`
      UPDATE travel_approvals
      SET status = 'approved', approver_id = $2, approver_name = $3, comments = $4, actioned_at = NOW()
      WHERE id = $1
    `, [id, user.employeeId, user.email, comments || null]);

    // Advance the request status
    await client.query(
      `UPDATE travel_requests SET status = $2, updated_at = NOW() WHERE id = $1`,
      [req.id, chain.to]
    );

    // Create the next approval step (skip finance if below threshold)
    if (chain.next_role) {
      const cost = parseFloat(req.estimated_cost_zar || 0);
      const needsFinance = chain.next_role === 'finance' && cost >= FINANCE_THRESHOLD_ZAR;
      const skipFinance  = chain.next_role === 'finance' && cost < FINANCE_THRESHOLD_ZAR;

      if (!skipFinance) {
        await client.query(`
          INSERT INTO travel_approvals (request_id, approver_role, status)
          VALUES ($1, $2, 'pending')
        `, [req.id, chain.next_role]);
      }
    }
  });

  // Notify employee
  const { rows: empRows } = await db.query(
    'SELECT * FROM employees WHERE id = $1',
    [req.employee_id]
  );
  if (empRows.length) {
    await travelRequestStatusEmail(empRows[0], req, chain.to).catch(console.error);
  }

  return ok({ message: `Request ${req.request_number} advanced to '${chain.to}'` });
}

async function rejectRequest(id, body, user) {
  const { reason } = body;
  if (!reason) return error('A rejection reason is required');

  const approverRole = getApproverRole(user);
  if (!approverRole) return forbidden();

  const { rows: approvalRows } = await db.query(
    'SELECT * FROM travel_approvals WHERE id = $1',
    [id]
  );
  if (!approvalRows.length) return notFound('Approval record');

  const approval = approvalRows[0];
  if (approval.status !== 'pending') return error('This approval has already been actioned');
  if (approval.approver_role !== approverRole) return error(`This approval requires role: ${approval.approver_role}`, 403);

  await db.transaction(async (client) => {
    await client.query(`
      UPDATE travel_approvals
      SET status = 'rejected', approver_id = $2, approver_name = $3, comments = $4, actioned_at = NOW()
      WHERE id = $1
    `, [id, user.employeeId, user.email, reason]);

    await client.query(`
      UPDATE travel_requests
      SET status = 'rejected', rejection_reason = $2, updated_at = NOW()
      WHERE id = $1
    `, [approval.request_id, reason]);
  });

  const { rows: reqRows } = await db.query('SELECT * FROM travel_requests WHERE id = $1', [approval.request_id]);
  const { rows: empRows } = await db.query('SELECT * FROM employees WHERE id = $1', [reqRows[0]?.employee_id]);
  if (empRows.length && reqRows.length) {
    await travelRequestStatusEmail(empRows[0], reqRows[0], 'rejected', reason).catch(console.error);
  }

  return ok({ message: 'Travel request rejected' });
}

exports.handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const method = event.httpMethod;
    const proxy = event.pathParameters?.proxy || '';
    const parts = proxy.split('/').filter(Boolean);
    const [id, action] = parts;

    if (method === 'OPTIONS') return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: '' };
    if (method === 'GET' && !id) return listPendingApprovals(event, user);
    if (method === 'POST' && id && action === 'approve') return approveRequest(id, parseBody(event), user);
    if (method === 'POST' && id && action === 'reject') return rejectRequest(id, parseBody(event), user);

    return error('Method not allowed', 405);
  } catch (err) {
    return serverError(err);
  }
};
