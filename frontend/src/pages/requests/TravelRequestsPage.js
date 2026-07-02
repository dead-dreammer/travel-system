import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, AlertTriangle, Info } from 'lucide-react';
import api from '../../services/api';

const fmt = (n) => 'R ' + Number(n).toLocaleString('en-ZA');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusColors = {
  pending: '#d97706', manager_approved: '#2563eb', travel_approved: '#0d9488',
  finance_approved: '#16a34a', booked: '#15803d', completed: '#6b7280',
  rejected: '#dc2626', cancelled: '#9ca3af',
};

const tripBadge = { domestic: { bg: '#dbeafe', color: '#1d4ed8' }, international: { bg: '#ede9fe', color: '#7c3aed' } };

const today = new Date().toISOString().slice(0, 10);

function policyWarnings(form) {
  const warnings = [];
  if (form.departure_date) {
    const days = Math.ceil((new Date(form.departure_date) - new Date()) / 86400000);
    if (days >= 0 && days < 14) warnings.push({ type: 'warn', msg: 'Late booking — advance booking required (less than 14 days notice)' });
  }
  if (Number(form.estimated_cost_zar) > 50000) warnings.push({ type: 'info', msg: 'Finance approval required for trips exceeding R 50,000' });
  if (form.trip_type === 'international') warnings.push({ type: 'info', msg: 'Passport and visa requirements will be checked by the travel coordinator' });
  return warnings;
}

export default function TravelRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ trip_type: 'domestic', purpose: '', destination_city: '', destination_country: 'South Africa', departure_date: '', return_date: '', estimated_cost_zar: '', priority: 'normal', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/travel-requests').then(res => {
      const d = res.data.data || res.data;
      setRequests(d.requests || d);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (typeFilter && r.trip_type !== typeFilter) return false;
    return true;
  });

  const warnings = policyWarnings(form);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/travel-requests', form);
      setShowForm(false);
      const res = await api.get('/travel-requests');
      const d = res.data.data || res.data;
      setRequests(d.requests || d);
    } finally { setSubmitting(false); }
  };

  const inp = (field, extra = {}) => ({
    value: form[field],
    onChange: (e) => {
      const val = e.target.value;
      setForm(f => ({ ...f, [field]: val, ...(field === 'trip_type' && val === 'domestic' ? { destination_country: 'South Africa' } : {}) }));
    },
    style: { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' },
    ...extra,
  });

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Travel Requests</h1>
        <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} /> New Request
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text)' }}>New Travel Request</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Trip Type</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['domestic', 'international'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="trip_type" value={t} checked={form.trip_type === t} onChange={e => setForm(f => ({ ...f, trip_type: e.target.value, destination_country: e.target.value === 'domestic' ? 'South Africa' : '' }))} />
                    <span style={{ textTransform: 'capitalize' }}>{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Purpose *</label>
              <input {...inp('purpose')} required placeholder="e.g. Client meeting, conference, site visit" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Destination City *</label>
              <input {...inp('destination_city')} required placeholder="e.g. Cape Town" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Destination Country *</label>
              <input {...inp('destination_country')} required readOnly={form.trip_type === 'domestic'} style={{ ...inp('destination_country').style, background: form.trip_type === 'domestic' ? '#f7fafc' : '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Departure Date *</label>
              <input type="date" min={today} {...inp('departure_date')} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Return Date *</label>
              <input type="date" min={form.departure_date || today} {...inp('return_date')} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Estimated Cost (ZAR) *</label>
              <input type="number" min="0" {...inp('estimated_cost_zar')} required placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Priority</label>
              <select {...inp('priority')}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea {...inp('notes')} rows={3} placeholder="Any additional information for the travel coordinator…" style={{ ...inp('notes').style, resize: 'vertical' }} />
            </div>
          </div>

          {warnings.map((w, i) => (
            <div key={i} style={{ marginTop: 12, padding: '10px 14px', borderRadius: 7, background: w.type === 'warn' ? '#fef9c3' : '#dbeafe', color: w.type === 'warn' ? '#854d0e' : '#1e40af', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              {w.type === 'warn' ? <AlertTriangle size={14} /> : <Info size={14} />} {w.msg}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={submitting} style={{ background: 'var(--primary)', color: '#fff', padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600 }}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 7, fontSize: 13, border: '1px solid #e2e8f0' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13 }}>
          <option value="">All Statuses</option>
          {['pending','manager_approved','travel_approved','finance_approved','booked','completed','rejected','cancelled'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13 }}>
          <option value="">All Types</option>
          <option value="domestic">Domestic</option>
          <option value="international">International</option>
        </select>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Request No','Trip Type','Destination','Departure','Return','Est. Cost','Status',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No requests found.</td></tr>
              ) : filtered.map(r => {
                const tb = tripBadge[r.trip_type] || {};
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent)' }}>{r.request_number}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: tb.bg, color: tb.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{r.trip_type}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{r.destination_city}, {r.destination_country}</td>
                    <td style={{ padding: '10px 14px' }}>{fmtDate(r.departure_date)}</td>
                    <td style={{ padding: '10px 14px' }}>{fmtDate(r.return_date)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{fmt(r.estimated_cost_zar)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: (statusColors[r.status] || '#6b7280') + '20', color: statusColors[r.status] || '#6b7280', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                        {r.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => navigate(`/requests/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', background: 'none', fontSize: 12, fontWeight: 600 }}>
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
