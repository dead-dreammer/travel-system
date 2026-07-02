import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const fmt = (n) => 'R ' + Number(n).toLocaleString('en-ZA');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const statusColors = {
  pending: '#d97706', manager_approved: '#2563eb', travel_approved: '#0d9488',
  finance_approved: '#16a34a', booked: '#15803d', completed: '#6b7280',
  rejected: '#dc2626', cancelled: '#6b7280',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
      <div style={{ background: color + '18', borderRadius: 10, padding: 12 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/travel-requests'),
      api.get('/approvals'),
      api.get('/bookings/upcoming'),
      api.get('/documents/expiring'),
    ]).then(([rRes, aRes, uRes, eRes]) => {
      const r = rRes.data.data || rRes.data;
      setRequests((r.requests || r).slice(0, 5));
      setApprovals(aRes.data.data || aRes.data);
      setUpcoming(uRes.data.data || uRes.data);
      setExpiring(eRes.data.data || eRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const active = requests.filter(r => !['completed', 'rejected', 'cancelled'].includes(r.status));

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Travel Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard icon={CheckSquare} label="Pending Approvals" value={approvals.length} color="#d97706" />
        <StatCard icon={Plane} label="Active Requests" value={active.length} color="#2b6cb0" />
        <StatCard icon={Clock} label="Upcoming Flights" value={upcoming.length} color="#0d9488" />
        <StatCard icon={AlertTriangle} label="Docs Expiring Soon" value={expiring.length} color="#dc2626" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Pending Approvals */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Pending Approvals</h2>
          {approvals.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No pending approvals.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Employee', 'Destination', 'Departure', 'Est. Cost'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvals.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f0f4f8', cursor: 'pointer' }} onClick={() => navigate(`/requests/${a.request_id}`)}>
                    <td style={{ padding: '8px 8px' }}>{a.employee_name}</td>
                    <td style={{ padding: '8px 8px' }}>{a.destination}</td>
                    <td style={{ padding: '8px 8px' }}>{fmtDate(a.departure_date)}</td>
                    <td style={{ padding: '8px 8px', fontWeight: 600 }}>{fmt(a.estimated_cost_zar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Documents Expiring */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Documents Expiring Soon</h2>
          {expiring.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No documents expiring within 90 days.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Employee', 'Type', 'Expiry Date', 'Days Left'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiring.map(d => {
                  const days = d.days_until_expiry;
                  const color = days < 30 ? '#dc2626' : days < 60 ? '#d97706' : '#16a34a';
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                      <td style={{ padding: '8px 8px' }}>{d.employee_name}</td>
                      <td style={{ padding: '8px 8px', textTransform: 'capitalize' }}>{d.document_type}</td>
                      <td style={{ padding: '8px 8px' }}>{fmtDate(d.expiry_date)}</td>
                      <td style={{ padding: '8px 8px', fontWeight: 700, color }}>{days} days</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Requests */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Recent Requests</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              {['Request No', 'Employee', 'Destination', 'Departure', 'Cost', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f0f4f8', cursor: 'pointer' }} onClick={() => navigate(`/requests/${r.id}`)}>
                <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--accent)' }}>{r.request_number}</td>
                <td style={{ padding: '8px 8px' }}>{r.employee_name}</td>
                <td style={{ padding: '8px 8px' }}>{r.destination_city}, {r.destination_country}</td>
                <td style={{ padding: '8px 8px' }}>{fmtDate(r.departure_date)}</td>
                <td style={{ padding: '8px 8px' }}>{fmt(r.estimated_cost_zar)}</td>
                <td style={{ padding: '8px 8px' }}>
                  <span style={{ background: (statusColors[r.status] || '#6b7280') + '20', color: statusColors[r.status] || '#6b7280', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                    {r.status?.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
