const { error, ok, serverError, getUserFromEvent } = require('../../utils/response');

const COORDINATOR_ROLES = ['travel_coordinator', 'admin'];

const DUFFEL_API_URL = process.env.DUFFEL_API_URL || 'https://api.duffel.com';
const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY;

function canSearch(user) {
  return COORDINATOR_ROLES.includes(user.role);
}

// Duffel represents each hop of a journey as a "slice" (e.g. outbound, return),
// and each slice as one or more "segments" (a segment is a single flight;
// a slice has multiple segments when there's a connection).
function buildSlices({ origin, destination, departure_date, return_date }) {
  const slices = [{ origin, destination, departure_date }];
  if (return_date) {
    slices.push({ origin: destination, destination: origin, departure_date: return_date });
  }
  return slices;
}

function simplifyOffer(offer) {
  return {
    id: offer.id,
    total_amount: offer.total_amount,
    total_currency: offer.total_currency,
    slices: (offer.slices || []).map((slice) => ({
      segments: (slice.segments || []).map((seg) => ({
        airline: seg.marketing_carrier?.name || seg.operating_carrier?.name,
        flight_number: `${seg.marketing_carrier?.iata_code || ''}${seg.marketing_carrier_flight_number || ''}`,
        origin: seg.origin?.iata_code,
        destination: seg.destination?.iata_code,
        departing_at: seg.departing_at,
        arriving_at: seg.arriving_at,
        cabin_class: offer.cabin_class,
      })),
      connections: Math.max(0, (slice.segments || []).length - 1),
    })),
  };
}

async function searchFlights(event, user) {
  if (!canSearch(user)) return error('Only Travel Coordinators can search flights', 403);
  if (!DUFFEL_API_KEY) return error('Flight search is not configured (DUFFEL_API_KEY missing)', 503);

  const qs = event.queryStringParameters || {};
  const { origin, destination, departure_date, return_date, cabin_class, passengers } = qs;

  if (!origin || !destination || !departure_date) {
    return error('Required query params: origin, destination, departure_date (IATA airport codes, YYYY-MM-DD)');
  }

  const passengerCount = Math.max(1, Math.min(9, parseInt(passengers || '1', 10) || 1));

  const requestBody = {
    data: {
      slices: buildSlices({ origin, destination, departure_date, return_date }),
      passengers: Array.from({ length: passengerCount }, () => ({ type: 'adult' })),
      cabin_class: cabin_class || 'economy',
    },
  };

  let res;
  try {
    res = await fetch(`${DUFFEL_API_URL}/air/offer_requests?return_offers=true&limit=10`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    console.error('[flightSearch] Duffel request failed:', err);
    return error('Could not reach the flight search provider', 502);
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    console.error('[flightSearch] Duffel returned an error:', res.status, JSON.stringify(payload));
    const message = payload?.errors?.[0]?.message || 'Flight search provider returned an error';
    return error(message, res.status >= 400 && res.status < 500 ? 400 : 502);
  }

  const offers = (payload?.data?.offers || []).map(simplifyOffer);

  return ok({
    offer_request_id: payload?.data?.id,
    offers,
  });
}

exports.handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const method = event.httpMethod;
    const proxy = event.pathParameters?.proxy || '';

    if (method === 'OPTIONS') return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,OPTIONS' }, body: '' };
    if (method === 'GET' && proxy === 'search') return searchFlights(event, user);

    return error('Method not allowed', 405);
  } catch (err) {
    return serverError(err);
  }
};
