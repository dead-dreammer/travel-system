import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const fmt = (n) => n != null ? 'R ' + Number(n).toLocaleString('en-ZA') : '—';

const severityColors = { low: { bg: '#dbeafe', c: '#1d4ed8' }, medium: { bg: '#fef9c3', c: '#d97706' }, high: { bg: '#fee2e2', c: '#dc2626' } };

function Bar({ value, max, color = '#2b6cb0' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return <div style={{ height: 8, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99 }} /></div>;
}

export default function ReportsPage() {
  const [spend, setSpend] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/reports/spend'), api.get('/reports/destinations'), api.get('/reports/compliance')]).then(([s, d, c]) => {
      setSpend(s.data.data || s.data);
      setDestinations(d.data.data || d.data);
      setCompliance(c.data.data || c.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;

  const domTrips = spend?.by_type?.find(t => t.type === 'Domestic');
  const intlTrips = spend?.by_type?.find(t => t.type === 'International');
  const maxDept = Math.max(...(spend?.by_department || []).map(d => d.spend));
  const maxMonth = Math.max(...(spend?.by_month || []).map(m => m.spend));
  const totalTrips = spend?.total_trips_ytd || 0;
  const complianceScore = totalTrips > 0 ? Math.round(((totalTrips - (compliance?.policy_violations || 0)) / totalTrips) * 100) : 100;

  const Th = ({ children }) => <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{children}</th>;

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Reports & Analytics</h1>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
        {[
          ['YTD Spend', fmt(spend?.total_spend_ytd), '#2b6cb0'],
          ['Total Trips', spend?.total_trips_ytd, '#0d9488'],
          ['Avg Trip Cost', fmt(spend?.avg_trip_cost), '#7c3aed'],
          ['Domestic / Intl', `${domTrips?.trips || 0} / ${intlTrips?.trips || 0}`, '#d97706'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Spend by Department */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Spend by Department</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr><Th>Department</Th><Th>Trips</Th><Th>Spend</Th><Th>%</Th></tr></thead>
            <tbody>
              {(spend?.by_department || []).map(d => (
                <tr key={d.department} style={{ borderBottom: '1px solid #f0f4f8' }}>
                  <td style={{ padding: '10px 14px' }}>
                    {d.department}
                    <Bar value={d.spend} max={maxDept} color="#2b6cb0" />
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{d.trips}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{fmt(d.spend)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{spend?.total_spend_ytd ? Math.round((d.spend / spend.total_spend_ytd) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Monthly Spend */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Monthly Spend</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr><Th>Month</Th><Th>Trips</Th><Th>Spend</Th></tr></thead>
            <tbody>
              {(spend?.by_month || []).map(m => (
                <tr key={m.month} style={{ borderBottom: '1px solid #f0f4f8' }}>
                  <td style={{ padding: '10px 14px' }}>
                    {m.month}
                    <Bar value={m.spend} max={maxMonth} color="#0d9488" />
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{m.trips}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{fmt(m.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Top Destinations */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Top Destinations</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr><Th>Destination</Th><Th>Trips</Th><Th>Spend</Th><Th>Type</Th></tr></thead>
            <tbody>
              {destinations.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f4f8' }}>
                  <td style={{ padding: '10px 14px' }}>{d.destination}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{d.trips}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{fmt(d.total_spend)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: d.trip_type === 'domestic' ? '#dbeafe' : '#ede9fe', color: d.trip_type === 'domestic' ? '#1d4ed8' : '#7c3aed', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{d.trip_type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Compliance */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Policy Compliance</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: complianceScore >= 90 ? '#dcfce7' : complianceScore >= 70 ? '#fef9c3' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: complianceScore >= 90 ? '#16a34a' : complianceScore >= 70 ? '#d97706' : '#dc2626' }}>{complianceScore}%</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {compliance?.policy_violations || 0} violation{compliance?.policy_violations !== 1 ? 's' : ''} out of {totalTrips} trip{totalTrips !== 1 ? 's' : ''}
            </div>
          </div>
          {(compliance?.violations || []).length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr><Th>Request</Th><Th>Employee</Th><Th>Violation</Th><Th>Severity</Th></tr></thead>
              <tbody>
                {compliance.violations.map((v, i) => {
                  const sc = severityColors[v.severity] || severityColors.low;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f4f8' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--accent)' }}>{v.request_number}</td>
                      <td style={{ padding: '8px 10px' }}>{v.employee_name}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{v.violation}</td>
                      <td style={{ padding: '8px 10px' }}><span style={{ background: sc.bg, color: sc.c, padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{v.severity}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Domestic vs International */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {(spend?.by_type || []).map(t => (
          <div key={t.type} style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{t.type}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: t.type === 'Domestic' ? '#1d4ed8' : '#7c3aed' }}>{fmt(t.spend)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{t.trips} trip{t.trips !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
