import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const fmt = (n) => 'R ' + Number(n).toLocaleString('en-ZA');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => {
    api.get('/approvals').then(res => {
      setApprovals(res.data.data || res.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    await api.post(`/approvals/${id}/approve`, { comments: 'Approved' });
    setApprovals(a => a.filter(x => x.id !== id));
  };

  const handleReject = async (id) => {
    await api.post(`/approvals/${id}/reject`, { comments: rejectComment });
    setApprovals(a => a.filter(x => x.id !== id));
    setRejectingId(null);
    setRejectComment('');
  };

  const pending = approvals.filter(a => a.status === 'pending');

  const Tab = ({ label, value }) => (
    <button onClick={() => setTab(value)} style={{ padding: '8px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: tab === value ? 'var(--primary)' : 'transparent', color: tab === value ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
      {label} {value === 'pending' && <span style={{ background: '#dc2626', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 10, marginLeft: 4 }}>{pending.length}</span>}
    </button>
  );

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Approvals</h1>

      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 99, width: 'fit-content', marginBottom: 28 }}>
        <Tab label="Pending" value="pending" />
        <Tab label="History" value="history" />
      </div>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading…</div> : (
        tab === 'pending' ? (
          pending.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60, background: '#fff', borderRadius: 10 }}>
              <Check size={40} color="#16a34a" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 600 }}>All caught up — no pending approvals</div>
            </div>
          ) : pending.map(a => (
            <div key={a.id} style={{ background: '#fff', borderRadius: 10, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', marginRight: 10 }}>{a.request_number}</span>
                  <span style={{ background: a.trip_type === 'domestic' ? '#dbeafe' : '#ede9fe', color: a.trip_type === 'domestic' ? '#1d4ed8' : '#7c3aed', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{a.trip_type}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Submitted {fmtDate(a.created_at)}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 14, fontSize: 13 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Employee</div>{a.employee_name}</div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Destination</div>{a.destination}</div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Departure</div>{fmtDate(a.departure_date)}</div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Estimated Cost</div><strong style={{ fontSize: 16 }}>{fmt(a.estimated_cost_zar)}</strong></div>
              </div>

              {a.purpose && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, fontStyle: 'italic' }}>"{a.purpose}"</div>}

              {a.policy_violations && a.policy_violations.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  {a.policy_violations.map((v, i) => (
                    <div key={i} style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: 7, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <AlertTriangle size={13} /> {v}
                    </div>
                  ))}
                </div>
              )}

              {rejectingId === a.id ? (
                <div style={{ marginTop: 8 }}>
                  <textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} placeholder="Reason for rejection (required)…" rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleReject(a.id)} disabled={!rejectComment.trim()} style={{ background: '#dc2626', color: '#fff', padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, opacity: rejectComment.trim() ? 1 : 0.5 }}>Confirm Reject</button>
                    <button onClick={() => { setRejectingId(null); setRejectComment(''); }} style={{ padding: '7px 14px', borderRadius: 7, fontSize: 13, border: '1px solid #e2e8f0' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => handleApprove(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                    <Check size={14} /> Approve
                  </button>
                  <button onClick={() => setRejectingId(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#dc2626', border: '1.5px solid #dc2626', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                    <X size={14} /> Reject
                  </button>
                  <button onClick={() => navigate(`/requests/${a.request_id}`)} style={{ color: 'var(--accent)', background: 'none', fontSize: 13, fontWeight: 600, marginLeft: 'auto' }}>View details →</button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Approval history will appear here once actions have been taken.</div>
          </div>
        )
      )}
    </div>
  );
}
