import React, { useEffect, useState } from 'react';
import { Plane } from 'lucide-react';
import api from '../../services/api';

const fmt = (n) => n != null ? 'R ' + Number(n).toLocaleString('en-ZA') : '—';
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusBadge = (s) => {
  const m = { confirmed: { bg: '#dcfce7', c: '#16a34a' }, cancelled: { bg: '#fee2e2', c: '#dc2626' }, pending: { bg: '#fef9c3', c: '#d97706' } };
  const t = m[s] || { bg: '#f1f5f9', c: '#6b7280' };
  return <span style={{ background: t.bg, color: t.c, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{s}</span>;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('flights');

  useEffect(() => {
    Promise.all([api.get('/bookings'), api.get('/bookings/upcoming')]).then(([b, u]) => {
      setBookings(b.data.data || b.data);
      setUpcoming(u.data.data || u.data);
    }).finally(() => setLoading(false));
  }, []);

  const Tab = ({ label, value }) => (
    <button onClick={() => setTab(value)} style={{ padding: '8px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: tab === value ? 'var(--primary)' : 'transparent', color: tab === value ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
      {label}
    </button>
  );

  const Th = ({ children }) => <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{children}</th>;
  const Td = ({ children, style }) => <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f0f4f8', ...style }}>{children}</td>;

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Bookings</h1>

      {upcoming.length > 0 && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1e40af' }}>
          <Plane size={15} /> <strong>{upcoming.length}</strong> flight{upcoming.length !== 1 ? 's' : ''} departing within the next 7 days
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 99, width: 'fit-content', marginBottom: 24 }}>
        <Tab label="Flights" value="flights" />
        <Tab label="Accommodation" value="accommodation" />
        <Tab label="Car Hire" value="car_hire" />
      </div>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading…</div> : (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
          {tab === 'flights' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <Th>Request</Th><Th>Employee</Th><Th>Airline & Flight</Th><Th>Route</Th><Th>Departure</Th><Th>Class</Th><Th>Fare</Th><Th>Leg</Th><Th>Ref</Th><Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No flight bookings.</td></tr>
                ) : bookings.map(b => (
                  <tr key={b.id}>
                    <Td><span style={{ fontWeight: 600, color: 'var(--accent)' }}>{b.request_number}</span></Td>
                    <Td>{b.employee_name}</Td>
                    <Td>{b.airline} {b.flight_number}</Td>
                    <Td>{b.departure_airport} → {b.arrival_airport}</Td>
                    <Td>{fmtDT(b.departure_datetime)}</Td>
                    <Td><span style={{ background: '#ccfbf1', color: '#0d9488', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{b.flight_class}</span></Td>
                    <Td style={{ fontWeight: 600 }}>{fmt(b.fare_zar)}</Td>
                    <Td><span style={{ background: b.leg === 'outbound' ? '#dbeafe' : '#f1f5f9', color: b.leg === 'outbound' ? '#1d4ed8' : '#6b7280', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{b.leg}</span></Td>
                    <Td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.booking_reference}</Td>
                    <Td>{statusBadge(b.status)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'accommodation' && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No accommodation bookings yet. Accommodation is added when processing a travel request.
            </div>
          )}

          {tab === 'car_hire' && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No car hire bookings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
