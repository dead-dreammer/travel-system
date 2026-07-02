import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Clock } from 'lucide-react';
import api from '../../services/api';

const fmt = (n) => n != null ? 'R ' + Number(n).toLocaleString('en-ZA') : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const statusColors = {
  pending: '#d97706', manager_approved: '#2563eb', travel_approved: '#0d9488',
  finance_approved: '#16a34a', booked: '#15803d', completed: '#6b7280',
  rejected: '#dc2626', cancelled: '#9ca3af',
};

function Badge({ text, color, bg }) {
  return <span style={{ background: bg || color + '20', color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{text?.replace(/_/g, ' ')}</span>;
}

export default function TravelRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/travel-requests/${id}`).then(res => {
      setReq(res.data.data || res.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  if (!req) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>Request not found.</div>;

  const flightsTotal = (req.flights || []).reduce((s, f) => s + (f.fare_zar || 0), 0);
  const accomTotal = (req.accommodation || []).reduce((s, a) => s + (a.total_zar || 0), 0);
  const grandTotal = flightsTotal + accomTotal;

  const approvalSteps = req.approvals || [];

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <button onClick={() => navigate('/requests')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', background: 'none', fontSize: 13, marginBottom: 20 }}>
        <ArrowLeft size={15} /> Back to Requests
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{req.request_number}</h1>
          <Badge text={req.status} color={statusColors[req.status] || '#6b7280'} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Submitted {fmtDate(req.created_at)}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Trip Details */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Trip Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              {[
                ['Trip Type', <Badge text={req.trip_type} color={req.trip_type === 'domestic' ? '#1d4ed8' : '#7c3aed'} bg={req.trip_type === 'domestic' ? '#dbeafe' : '#ede9fe'} />],
                ['Purpose', req.purpose],
                ['Destination', `${req.destination_city}, ${req.destination_country}`],
                ['Departure', fmtDate(req.departure_date)],
                ['Return', fmtDate(req.return_date)],
                ['Duration', req.departure_date && req.return_date ? `${Math.max(1, Math.ceil((new Date(req.return_date) - new Date(req.departure_date)) / 86400000))} day(s)` : '—'],
                ['Estimated Cost', <strong>{fmt(req.estimated_cost_zar)}</strong>],
                ['Priority', <Badge text={req.priority} color={req.priority === 'urgent' ? '#dc2626' : '#6b7280'} />],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div>{val}</div>
                </div>
              ))}
              {req.notes && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                  <div>{req.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Policy */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>Policy Compliance</h2>
            {(!req.policy_violations || req.policy_violations.length === 0) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a', fontSize: 13 }}>
                <Check size={16} /> Policy compliant
              </div>
            ) : req.policy_violations.map((v, i) => (
              <div key={i} style={{ background: '#fef9c3', color: '#854d0e', padding: '8px 12px', borderRadius: 7, fontSize: 13, marginBottom: 6 }}>{v}</div>
            ))}
            {req.rejection_reason && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 7, fontSize: 13, marginTop: 8 }}>
                <strong>Rejection reason:</strong> {req.rejection_reason}
              </div>
            )}
          </div>

          {/* Approval Timeline */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Approval Timeline</h2>
            {approvalSteps.map((step, i) => {
              const icon = step.status === 'approved' ? <Check size={14} color="#fff" /> : step.status === 'rejected' ? <X size={14} color="#fff" /> : <Clock size={14} color="#fff" />;
              const bg = step.status === 'approved' ? '#16a34a' : step.status === 'rejected' ? '#dc2626' : '#94a3b8';
              return (
                <div key={step.id} style={{ display: 'flex', gap: 12, marginBottom: i < approvalSteps.length - 1 ? 20 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                    {i < approvalSteps.length - 1 && <div style={{ width: 2, flex: 1, background: '#e2e8f0', marginTop: 4 }} />}
                  </div>
                  <div style={{ paddingBottom: 16, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{step.approver_role?.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{step.approver_name}</div>
                    {step.comments && <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4, fontStyle: 'italic' }}>"{step.comments}"</div>}
                    {step.actioned_at && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{fmtDate(step.actioned_at)}</div>}
                  </div>
                </div>
              );
            })}
            {approvalSteps.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No approval steps recorded.</p>}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Flights */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>Flight Bookings</h2>
            {(!req.flights || req.flights.length === 0) ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No flights booked yet.</p>
            ) : req.flights.map(f => (
              <div key={f.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{f.airline} {f.flight_number}</strong>
                  <Badge text={f.leg} color={f.leg === 'outbound' ? '#1d4ed8' : '#6b7280'} bg={f.leg === 'outbound' ? '#dbeafe' : '#f1f5f9'} />
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{f.departure_airport} → {f.arrival_airport}</div>
                <div style={{ marginBottom: 4 }}>{fmtDT(f.departure_datetime)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Badge text={f.flight_class} color="#0d9488" bg="#ccfbf1" />
                  <strong>{fmt(f.fare_zar)}</strong>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Ref: {f.booking_reference}</div>
              </div>
            ))}
          </div>

          {/* Accommodation */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>Accommodation</h2>
            {(!req.accommodation || req.accommodation.length === 0) ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No accommodation booked.</p>
            ) : req.accommodation.map(a => (
              <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10, fontSize: 13 }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>{a.hotel_name}</strong>
                <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{a.city}, {a.country}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Check-in:</span> {fmtDate(a.check_in)}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Check-out:</span> {fmtDate(a.check_out)}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>{a.nights} nights @ {fmt(a.rate_per_night_zar)}/night</span></div>
                  <div><strong>{fmt(a.total_zar)}</strong></div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Ref: {a.booking_reference}</div>
              </div>
            ))}
          </div>

          {/* Cost Summary */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>Cost Summary</h2>
            <div style={{ fontSize: 13 }}>
              {[['Flights', flightsTotal], ['Accommodation', accomTotal]].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--text-muted)' }}>
                  <span>{label}</span><span>{fmt(val)}</span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                <span>Total Booked</span><span style={{ color: grandTotal > req.estimated_cost_zar ? '#dc2626' : '#16a34a' }}>{fmt(grandTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>Estimated</span><span>{fmt(req.estimated_cost_zar)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
