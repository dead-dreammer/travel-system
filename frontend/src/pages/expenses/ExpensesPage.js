import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const fmt = (n) => n != null ? 'R ' + Number(n).toLocaleString('en-ZA') : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusColors = { draft: '#6b7280', submitted: '#d97706', approved: '#16a34a', rejected: '#dc2626', paid: '#7c3aed' };

export default function ExpensesPage() {
  const [claims, setClaims] = useState([]);
  const [perDiem, setPerDiem] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('claims');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/expenses'), api.get('/expenses/per-diem-rates')]).then(([c, p]) => {
      setClaims(c.data.data || c.data);
      setPerDiem(p.data.data || p.data);
    }).finally(() => setLoading(false));
  }, []);

  const pending = claims.filter(c => c.status === 'submitted').length;
  const approvedTotal = claims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.total_zar || 0), 0);
  const drafts = claims.filter(c => c.status === 'draft').length;

  const Tab = ({ label, value }) => (
    <button onClick={() => setTab(value)} style={{ padding: '8px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: tab === value ? 'var(--primary)' : 'transparent', color: tab === value ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
      {label}
    </button>
  );

  const Th = ({ children }) => <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{children}</th>;

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Expenses</h1>

      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 99, width: 'fit-content', marginBottom: 24 }}>
        <Tab label="Claims" value="claims" />
        <Tab label="Per Diem Rates" value="perdiem" />
      </div>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading…</div> : (
        tab === 'claims' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
              {[['Pending Claims', pending, '#d97706'], ['Approved YTD', fmt(approvedTotal), '#16a34a'], ['My Drafts', drafts, '#6b7280']].map(([label, val, color]) => (
                <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr><Th>Claim No</Th><Th>Employee</Th><Th>Trip</Th><Th>Status</Th><Th>Total</Th><Th>Submitted</Th><Th></Th></tr>
                </thead>
                <tbody>
                  {claims.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No expense claims.</td></tr>
                  ) : claims.map(c => (
                    <React.Fragment key={c.id}>
                      <tr style={{ borderBottom: '1px solid #f0f4f8', cursor: 'pointer' }} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>{c.claim_number}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{c.employee_name}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{c.request_number} — {c.trip_destination}</td>
                        <td style={{ padding: '10px 14px' }}><span style={{ background: (statusColors[c.status] || '#6b7280') + '20', color: statusColors[c.status] || '#6b7280', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{c.status}</span></td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13 }}>{fmt(c.total_zar)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{fmtDate(c.submission_date)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{expanded === c.id ? 'Hide ▲' : 'Details ▼'}</td>
                      </tr>
                      {expanded === c.id && (
                        <tr>
                          <td colSpan={7} style={{ background: '#f8fafc', padding: '16px 20px' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>No line items loaded in mock — submit the claim to see detailed breakdown.</div>
                            {c.status === 'draft' && (
                              <button onClick={() => alert('Mock: Claim submitted for approval')} style={{ background: '#d97706', color: '#fff', padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, marginRight: 8 }}>Submit for Approval</button>
                            )}
                            {c.status === 'submitted' && (
                              <>
                                <button onClick={() => alert('Mock: Claim approved')} style={{ background: '#16a34a', color: '#fff', padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, marginRight: 8 }}>Approve</button>
                                <button onClick={() => alert('Mock: Claim rejected')} style={{ background: '#dc2626', color: '#fff', padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600 }}>Reject</button>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fffbeb' }}>
              <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>SARS 2024/25 approved per diem rates. These rates apply for each full day of international or domestic travel. Accommodation costs are claimed separately.</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <Th>Country</Th><Th>City</Th><Th>Daily Rate (ZAR)</Th>
                </tr>
              </thead>
              <tbody>
                {perDiem.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{r.country}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{r.city || 'All cities'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>{fmt(r.rate_zar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
