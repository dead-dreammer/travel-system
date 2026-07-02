const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json',
};

function ok(data, statusCode = 200) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, data }),
  };
}

function created(data) {
  return ok(data, 201);
}

function error(message, statusCode = 400, details = null) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({ success: false, error: message, ...(details && { details }) }),
  };
}

function notFound(resource = 'Resource') {
  return error(`${resource} not found`, 404);
}

function forbidden() {
  return error('Access denied', 403);
}

function serverError(err) {
  console.error('Unhandled error:', err);
  return error('Internal server error', 500);
}

function parseBody(event) {
  if (!event.body) return {};
  return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
}

function getPathParam(event, param) {
  return event.pathParameters?.[param] || event.pathParameters?.proxy?.split('/')[0];
}

function getUserFromEvent(event) {
  const claims = event.requestContext?.authorizer?.claims || {};
  return {
    sub:        claims.sub,
    email:      claims.email,
    role:       claims['custom:role'],
    department: claims['custom:department'],
    employeeId: claims['custom:employee_id'],
  };
}

module.exports = { ok, created, error, notFound, forbidden, serverError, parseBody, getPathParam, getUserFromEvent };
