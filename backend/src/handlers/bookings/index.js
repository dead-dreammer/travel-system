const db = require('../../db/pool');
const { ok, created, error, notFound, forbidden, serverError, parseBody, getUserFromEvent } = require('../../utils/response');

const COORDINATOR_ROLES = ['travel_coordinator', 'admin'];

function canBook(user) {
  return COORDINATOR_ROLES.includes(user.role);
}

async function assertRequestApproved(requestId) {
  const { rows } = await db.query('SELECT * FROM travel_requests WHERE id = $1', [requestId]);
  if (!rows.length) return { err: notFound('Travel request') };
  const req = rows[0];
  const bookableStatuses = ['travel_approved', 'finance_approved', 'booked'];
  if (!bookableStatuses.includes(req.status)) {
    return { err: error(`Request must be travel_approved or finance_approved before booking. Current status: ${req.status}`) };
  }
  return { req };
}

async function listBookings(event, user) {
  const qs = event.queryStringParameters || {};
  const { request_id, from_date, to_date } = qs;

  const params = [];
  const conditions = [];

  if (request_id) {
    params.push(request_id);
    conditions.push(`fb.request_id = $${params.length}`);
  }
  if (from_date) {
    params.push(from_date);
    conditions.push(`fb.departure_datetime::date >= $${params.length}`);
  }
  if (to_date) {
    params.push(to_date);
    conditions.push(`fb.departure_datetime::date <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [flights, accommodation, cars] = await Promise.all([
    db.query(`SELECT fb.*, tr.request_number, tr.employee_id FROM flight_bookings fb JOIN travel_requests tr ON fb.request_id = tr.id ${where} ORDER BY fb.departure_datetime`, params),
    db.query(`SELECT ab.*, tr.request_number FROM accommodation_bookings ab JOIN travel_requests tr ON ab.request_id = tr.id ORDER BY ab.check_in`),
    db.query(`SELECT ch.*, tr.request_number FROM car_hire_bookings ch JOIN travel_requests tr ON ch.request_id = tr.id ORDER BY ch.pickup_datetime`),
  ]);

  return ok({ flight_bookings: flights.rows, accommodation_bookings: accommodation.rows, car_hire_bookings: cars.rows });
}

async function createFlightBooking(body, user) {
  if (!canBook(user)) return forbidden();

  const {
    request_id, booking_reference, airline, flight_number,
    departure_airport, arrival_airport, departure_datetime, arrival_datetime,
    flight_class, fare_zar, is_return, leg,
  } = body;

  if (!request_id || !departure_airport || !arrival_airport || !departure_datetime) {
    return error('Required: request_id, departure_airport, arrival_airport, departure_datetime');
  }

  const { err, req } = await assertRequestApproved(request_id);
  if (err) return err;

  const { rows } = await db.query(`
    INSERT INTO flight_bookings (
      request_id, booking_reference, airline, flight_number,
      departure_airport, arrival_airport, departure_datetime, arrival_datetime,
      flight_class, fare_zar, is_return, leg, booked_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
  `, [
    request_id, booking_reference, airline, flight_number,
    departure_airport, arrival_airport, departure_datetime, arrival_datetime,
    flight_class || 'economy', fare_zar || null,
    is_return || false, leg || 'outbound', user.email,
  ]);

  // Update request status to booked
  await db.query(
    `UPDATE travel_requests SET status = 'booked', updated_at = NOW() WHERE id = $1 AND status != 'booked'`,
    [request_id]
  );

  return created(rows[0]);
}

async function createAccommodationBooking(body, user) {
  if (!canBook(user)) return forbidden();

  const {
    request_id, hotel_name, city, country, check_in, check_out,
    nights, rate_per_night_zar, total_zar, booking_reference,
  } = body;

  if (!request_id || !hotel_name || !check_in || !check_out) {
    return error('Required: request_id, hotel_name, check_in, check_out');
  }

  const { err } = await assertRequestApproved(request_id);
  if (err) return err;

  const computedNights = nights || Math.ceil(
    (new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24)
  );
  const computedTotal = total_zar || (rate_per_night_zar ? rate_per_night_zar * computedNights : null);

  const { rows } = await db.query(`
    INSERT INTO accommodation_bookings (
      request_id, hotel_name, city, country, check_in, check_out,
      nights, rate_per_night_zar, total_zar, booking_reference, booked_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `, [
    request_id, hotel_name, city, country, check_in, check_out,
    computedNights, rate_per_night_zar || null, computedTotal, booking_reference, user.email,
  ]);

  return created(rows[0]);
}

async function createCarHireBooking(body, user) {
  if (!canBook(user)) return forbidden();

  const {
    request_id, provider, vehicle_category, pickup_location, dropoff_location,
    pickup_datetime, dropoff_datetime, total_zar, booking_reference,
  } = body;

  if (!request_id || !pickup_location || !pickup_datetime) {
    return error('Required: request_id, pickup_location, pickup_datetime');
  }

  const { err } = await assertRequestApproved(request_id);
  if (err) return err;

  const { rows } = await db.query(`
    INSERT INTO car_hire_bookings (
      request_id, provider, vehicle_category, pickup_location, dropoff_location,
      pickup_datetime, dropoff_datetime, total_zar, booking_reference
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `, [
    request_id, provider, vehicle_category, pickup_location, dropoff_location || pickup_location,
    pickup_datetime, dropoff_datetime, total_zar || null, booking_reference,
  ]);

  return created(rows[0]);
}

async function updateFlightBooking(id, body, user) {
  if (!canBook(user)) return forbidden();

  const allowed = [
    'booking_reference', 'airline', 'flight_number', 'departure_airport', 'arrival_airport',
    'departure_datetime', 'arrival_datetime', 'flight_class', 'fare_zar', 'status', 'leg',
  ];

  const updates = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([k, _], i) => `${k} = $${i + 2}`);

  if (!updates.length) return error('No valid fields to update');

  const values = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([, v]) => v);

  const { rows } = await db.query(
    `UPDATE flight_bookings SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  if (!rows.length) return notFound('Flight booking');
  return ok(rows[0]);
}

async function getUpcomingFlights(user) {
  const { rows } = await db.query(`
    SELECT fb.*, tr.request_number, tr.employee_id,
           e.first_name, e.last_name, e.email
    FROM flight_bookings fb
    JOIN travel_requests tr ON fb.request_id = tr.id
    LEFT JOIN employees e ON tr.employee_id = e.id
    WHERE fb.departure_datetime BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      AND fb.status = 'confirmed'
    ORDER BY fb.departure_datetime
  `);
  return ok(rows);
}

exports.handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const method = event.httpMethod;
    const proxy = event.pathParameters?.proxy || '';
    const parts = proxy.split('/').filter(Boolean);

    if (method === 'OPTIONS') return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: '' };

    // GET /bookings
    if (method === 'GET' && !proxy) return listBookings(event, user);
    // GET /bookings/upcoming
    if (method === 'GET' && proxy === 'upcoming') return getUpcomingFlights(user);
    // POST /bookings/flights
    if (method === 'POST' && parts[0] === 'flights' && !parts[1]) return createFlightBooking(parseBody(event), user);
    // POST /bookings/accommodation
    if (method === 'POST' && parts[0] === 'accommodation') return createAccommodationBooking(parseBody(event), user);
    // POST /bookings/car-hire
    if (method === 'POST' && parts[0] === 'car-hire') return createCarHireBooking(parseBody(event), user);
    // PUT /bookings/flights/{id}
    if (method === 'PUT' && parts[0] === 'flights' && parts[1]) return updateFlightBooking(parts[1], parseBody(event), user);

    return error('Method not allowed', 405);
  } catch (err) {
    return serverError(err);
  }
};
