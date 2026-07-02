import React, { useState } from 'react';
import { Search, Plane, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CABIN_CLASSES = ['economy', 'business', 'first'];

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d8dee8',
  fontSize: 12.5, background: '#fff',
};
const labelStyle = { fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, display: 'block' };

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Duffel returns each leg (outbound/return) as a "slice" made of one or more
// connecting "segments". For booking, we take the first segment of each
// slice — multi-segment (connecting) itineraries can be refined manually
// after saving.
function draftLegsFromOffer(offer, requestId) {
  const legCount = offer.slices.length;
  const perLegFare = offer.total_currency === 'ZAR' && offer.total_amount
    ? (parseFloat(offer.total_amount) / legCount).toFixed(2)
    : '';

  return offer.slices.map((slice, i) => {
    const seg = slice.segments[0] || {};
    return {
      key: `${offer.id}-${i}`,
      request_id: requestId,
      booking_reference: offer.id,
      airline: seg.airline || '',
      flight_number: seg.flight_number || '',
      departure_airport: seg.origin || '',
      arrival_airport: seg.destination || '',
      departure_datetime: seg.departing_at ? seg.departing_at.slice(0, 16) : '',
      arrival_datetime: seg.arriving_at ? seg.arriving_at.slice(0, 16) : '',
      flight_class: seg.cabin_class || 'economy',
      fare_zar: perLegFare,
      leg: i === 0 ? 'outbound' : 'return',
      is_return: i > 0,
      offer_currency: offer.total_currency,
      connections: slice.connections,
    };
  });
}

export default function FlightSearchPanel({ requestId, onBooked }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ origin: '', destination: '', departure_date: '', return_date: '', cabin_class: 'economy' });
  const [searching, setSearching] = useState(false);
  const [offers, setOffers] = useState(null);
  const [draftLegs, setDraftLegs] = useState([]);
  const [savingKey, setSavingKey] = useState(null);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function runSearch(e) {
    e.preventDefault();
    if (!form.origin || !form.destination || !form.departure_date) {
      toast.error('Origin, destination, and departure date are required');
      return;
    }
    setSearching(true);
    setOffers(null);
    try {
      const res = await api.get('/flights/search', {
        params: {
          origin: form.origin.toUpperCase(),
          destination: form.destination.toUpperCase(),
          departure_date: form.departure_date,
          return_date: form.return_date || undefined,
          cabin_class: form.cabin_class,
        },
      });
      const data = res.data.data || res.data;
      setOffers(data.offers || []);
      if (!data.offers || data.offers.length === 0) toast('No flights found for that search.', { icon: '✈️' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Flight search failed');
    } finally {
      setSearching(false);
    }
  }

  function useOffer(offer) {
    setDraftLegs(draftLegsFromOffer(offer, requestId));
  }

  function updateLeg(key, field, value) {
    setDraftLegs((legs) => legs.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }

  async function saveLeg(leg) {
    if (!leg.departure_airport || !leg.arrival_airport || !leg.departure_datetime) {
      toast.error('Departure airport, arrival airport, and departure time are required');
      return;
    }
    setSavingKey(leg.key);
    try {
      await api.post('/bookings/flights', {
        request_id: leg.request_id,
        booking_reference: leg.booking_reference,
        airline: leg.airline,
        flight_number: leg.flight_number,
        departure_airport: leg.departure_airport,
        arrival_airport: leg.arrival_airport,
        departure_datetime: leg.departure_datetime,
        arrival_datetime: leg.arrival_datetime || null,
        flight_class: leg.flight_class,
        fare_zar: leg.fare_zar ? parseFloat(leg.fare_zar) : null,
        is_return: leg.is_return,
        leg: leg.leg,
      });
      toast.success(`${leg.leg === 'outbound' ? 'Outbound' : 'Return'} flight booked`);
      setDraftLegs((legs) => legs.filter((l) => l.key !== leg.key));
      onBooked?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save booking');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div style={{ marginTop: 14, borderTop: '1px dashed #e2e8f0', paddingTop: 14 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <Search size={14} /> {open ? 'Hide flight search' : 'Search flights to book'}
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <form onSubmit={runSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) auto', gap: 8, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>From (IATA)</label>
              <input style={inputStyle} maxLength={3} placeholder="JNB" value={form.origin} onChange={(e) => setField('origin', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>To (IATA)</label>
              <input style={inputStyle} maxLength={3} placeholder="CPT" value={form.destination} onChange={(e) => setField('destination', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Depart</label>
              <input style={inputStyle} type="date" value={form.departure_date} onChange={(e) => setField('departure_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Return (optional)</label>
              <input style={inputStyle} type="date" value={form.return_date} onChange={(e) => setField('return_date', e.target.value)} />
            </div>
            <button type="submit" disabled={searching} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              {searching ? <Loader2 size={14} className="spin" /> : <Search size={14} />} Search
            </button>
          </form>

          {offers && offers.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {offers.map((offer) => (
                <div key={offer.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  {offer.slices.map((slice, i) => {
                    const seg = slice.segments[0] || {};
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, marginBottom: i < offer.slices.length - 1 ? 6 : 0 }}>
                        <Plane size={13} color="var(--text-muted)" />
                        <span style={{ fontWeight: 600 }}>{seg.airline} {seg.flight_number}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{seg.origin} → {seg.destination}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{fmtDateTime(seg.departing_at)} – {fmtDateTime(seg.arriving_at)}</span>
                        {slice.connections > 0 && <span style={{ fontSize: 10.5, color: '#d97706' }}>{slice.connections} connection(s) — first segment shown only</span>}
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f4f8' }}>
                    <strong style={{ fontSize: 13.5 }}>{offer.total_currency} {offer.total_amount}</strong>
                    <button onClick={() => useOffer(offer)} style={{ padding: '6px 14px', borderRadius: 6, background: '#eff6ff', color: 'var(--primary)', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Use this itinerary
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {draftLegs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Confirm booking details</div>
              {draftLegs.map((leg) => (
                <div key={leg.key} style={{ border: '1px solid #bfdbfe', background: '#f8faff', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  {leg.offer_currency && leg.offer_currency !== 'ZAR' && (
                    <div style={{ fontSize: 11, color: '#d97706', marginBottom: 8 }}>
                      Quoted in {leg.offer_currency} — confirm the ZAR fare before saving.
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
                    <div><label style={labelStyle}>Leg</label><input style={inputStyle} value={leg.leg} disabled /></div>
                    <div><label style={labelStyle}>Airline</label><input style={inputStyle} value={leg.airline} onChange={(e) => updateLeg(leg.key, 'airline', e.target.value)} /></div>
                    <div><label style={labelStyle}>Flight #</label><input style={inputStyle} value={leg.flight_number} onChange={(e) => updateLeg(leg.key, 'flight_number', e.target.value)} /></div>
                    <div><label style={labelStyle}>Booking ref</label><input style={inputStyle} value={leg.booking_reference} onChange={(e) => updateLeg(leg.key, 'booking_reference', e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
                    <div><label style={labelStyle}>From</label><input style={inputStyle} value={leg.departure_airport} onChange={(e) => updateLeg(leg.key, 'departure_airport', e.target.value)} /></div>
                    <div><label style={labelStyle}>To</label><input style={inputStyle} value={leg.arrival_airport} onChange={(e) => updateLeg(leg.key, 'arrival_airport', e.target.value)} /></div>
                    <div><label style={labelStyle}>Departs</label><input style={inputStyle} type="datetime-local" value={leg.departure_datetime} onChange={(e) => updateLeg(leg.key, 'departure_datetime', e.target.value)} /></div>
                    <div><label style={labelStyle}>Arrives</label><input style={inputStyle} type="datetime-local" value={leg.arrival_datetime} onChange={(e) => updateLeg(leg.key, 'arrival_datetime', e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                    <div>
                      <label style={labelStyle}>Class</label>
                      <select style={inputStyle} value={leg.flight_class} onChange={(e) => updateLeg(leg.key, 'flight_class', e.target.value)}>
                        {CABIN_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Fare (ZAR)</label>
                      <input style={inputStyle} type="number" step="0.01" value={leg.fare_zar} onChange={(e) => updateLeg(leg.key, 'fare_zar', e.target.value)} />
                    </div>
                    <button
                      onClick={() => saveLeg(leg)}
                      disabled={savingKey === leg.key}
                      style={{ padding: '8px 16px', borderRadius: 6, background: '#16a34a', color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {savingKey === leg.key ? 'Saving…' : 'Save Booking'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
