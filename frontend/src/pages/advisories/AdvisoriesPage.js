import React, { useEffect, useState } from 'react';
import { Plus, AlertTriangle, CheckCircle, AlertOctagon, XOctagon } from 'lucide-react';
import api from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const levelConfig = {
  safe:          { bg: '#dcfce7', border: '#86efac', color: '#16a34a', label: 'Safe',         icon: CheckCircle },
  caution:       { bg: '#fef9c3', border: '#fde68a', color: '#d97706', label: 'Caution',      icon: AlertTriangle },
  high_risk:     { bg: '#ffedd5', border: '#fed7aa', color: '#ea580c', label: 'High Risk',    icon: AlertOctagon },
  do_not_travel: { bg: '#fee2e2', border: '#fca5a5', color: '#dc2626', label: 'Do Not Travel',icon: XOctagon },
};

export default function AdvisoriesPage() {
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ country: '', city: '', level: 'safe', title: '', description: '', valid_until: '' });

  useEffect(() => {
    api.get('/advisories').then(res => {
      setAdvisories(res.data.data || res.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = advisories.filter(a => !levelFilter || a.level === levelFilter);

  const inp = (field) => ({
    value: form[field],
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    style: { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/advisories', form);
    setShowForm(false);
    const res = await api.get('/advisories');
    setAdvisories(res.data.data || res.data);
  };

  const FilterBtn = ({ value, label }) => (
    <button onClick={() => setLevelFilter(value)} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: levelFilter === value ? 'var(--primary)' : '#fff', color: levelFilter === value ? '#fff' : 'var(--text-muted)', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Travel Advisories</h1>
        <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} /> Add Advisory
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>New Travel Advisory</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Country *</label>
              <input {...inp('country')} required placeholder="e.g. Nigeria" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>City (optional)</label>
              <input {...inp('city')} placeholder="Leave blank for country-wide" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Level *</label>
              <select {...inp('level')} required>
                {Object.entries(levelConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Valid Until *</label>
              <input type="date" {...inp('valid_until')} required />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Title *</label>
              <input {...inp('title')} required placeholder="Advisory title" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Description *</label>
              <textarea {...inp('description')} required rows={4} style={{ ...inp('description').style, resize: 'vertical' }} placeholder="Detailed advisory information…" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="submit" style={{ background: 'var(--primary)', color: '#fff', padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600 }}>Publish Advisory</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 7, fontSize: 13, border: '1px solid #e2e8f0' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <FilterBtn value="" label="All" />
        {Object.entries(levelConfig).map(([k, v]) => <FilterBtn key={k} value={k} label={v.label} />)}
      </div>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading…</div> : (
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>No advisories for this filter.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {filtered.map(a => {
              const cfg = levelConfig[a.level] || levelConfig.safe;
              const Icon = cfg.icon;
              return (
                <div key={a.id} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden', border: `1px solid ${cfg.border}` }}>
                  <div style={{ background: cfg.bg, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${cfg.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={16} color={cfg.color} />
                      <strong style={{ fontSize: 14, color: cfg.color }}>{a.country}{a.city ? `, ${a.city}` : ''}</strong>
                    </div>
                    <span style={{ background: cfg.color + '20', color: cfg.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{cfg.label}</span>
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{a.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>{a.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>Issued by {a.issued_by}</span>
                      <span>Valid until {fmtDate(a.valid_until)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
