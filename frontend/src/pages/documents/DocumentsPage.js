import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Search } from 'lucide-react';
import api from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const reqBadge = { visa_free: { bg: '#dcfce7', c: '#16a34a', label: 'Visa Free' }, e_visa: { bg: '#dbeafe', c: '#1d4ed8', label: 'eVisa' }, visa_on_arrival: { bg: '#ccfbf1', c: '#0d9488', label: 'On Arrival' }, visa_required: { bg: '#fee2e2', c: '#dc2626', label: 'Visa Required' } };

function daysColor(days) {
  if (days < 30) return '#dc2626';
  if (days < 90) return '#d97706';
  return '#16a34a';
}

function daysUntil(expiry) {
  return Math.ceil((new Date(expiry) - new Date()) / 86400000);
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [visaReqs, setVisaReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/documents'), api.get('/documents/expiring'), api.get('/visa-requirements')]).then(([d, e, v]) => {
      setDocs(d.data.data || d.data);
      setExpiring(e.data.data || e.data);
      setVisaReqs(v.data.data || v.data);
    }).finally(() => setLoading(false));
  }, []);

  const Tab = ({ label, value }) => (
    <button onClick={() => setTab(value)} style={{ padding: '8px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: tab === value ? 'var(--primary)' : 'transparent', color: tab === value ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
      {label}
    </button>
  );

  const filteredDocs = docs.filter(d => !expiringOnly || daysUntil(d.expiry_date) < 90);
  const filteredVisa = visaReqs.filter(v => v.destination_country.toLowerCase().includes(search.toLowerCase()));

  const Th = ({ children }) => <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{children}</th>;

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Travel Documents</h1>

      {expiring.length > 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#92400e' }}>
          <AlertTriangle size={15} /> <strong>{expiring.length}</strong> document{expiring.length !== 1 ? 's' : ''} expiring within 90 days — action required
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 99, width: 'fit-content', marginBottom: 24 }}>
        <Tab label="Documents" value="all" />
        <Tab label="Visa Requirements" value="visa" />
      </div>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading…</div> : (
        tab === 'all' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={expiringOnly} onChange={e => setExpiringOnly(e.target.checked)} /> Show expiring within 90 days only
              </label>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}><tr><Th>Employee</Th><Th>Type</Th><Th>Document No</Th><Th>Issued By</Th><Th>Issue Date</Th><Th>Expiry Date</Th><Th>Days Left</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {filteredDocs.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No documents found.</td></tr>
                  ) : filteredDocs.map(d => {
                    const days = daysUntil(d.expiry_date);
                    const color = daysColor(days);
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.employee_name}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, textTransform: 'capitalize' }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} />{d.document_type}</span></td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'monospace' }}>{d.document_number}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.issuing_country}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{fmtDate(d.issue_date)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{fmtDate(d.expiry_date)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color }}>{days} days</td>
                        <td style={{ padding: '10px 14px' }}><span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{d.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div style={{ position: 'relative', marginBottom: 16, maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by country…" style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}><tr><Th>Destination Country</Th><Th>Requirement</Th><Th>Max Stay</Th><Th>Notes</Th></tr></thead>
                <tbody>
                  {filteredVisa.map((v, i) => {
                    const badge = reqBadge[v.requirement] || { bg: '#f1f5f9', c: '#6b7280', label: v.requirement };
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f4f8' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>{v.destination_country}</td>
                        <td style={{ padding: '10px 14px' }}><span style={{ background: badge.bg, color: badge.c, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{badge.label}</span></td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{v.max_stay_days ? `${v.max_stay_days} days` : '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{v.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </div>
  );
}
