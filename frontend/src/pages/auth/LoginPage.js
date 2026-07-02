import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../../store/slices/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/dashboard');
    }
  };

  const fillDemo = (email) => setForm({ email, password: 'password' });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 40, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-2 0-4 1-4 1l-3.5 3.5L4 6.2l-1 1 3 3-1 1.5-2.5-.5L2 13l2 2 2 2 1-.5-.5 2.5 1.5 1 1-2.5 3-1 3 3 1-1L17.8 19.2z" />
            </svg>
          </div>
          <h1 style={{ color: 'var(--primary)', fontSize: 22, fontWeight: 700 }}>Travel Management</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>Sign in to your account</p>
        </div>

        {process.env.REACT_APP_MOCK === 'true' && (
          <div style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 12 }}>
            <strong>Demo mode</strong> — click a role to fill in credentials (password: <code>password</code>):
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { email: 'coordinator@travel.local', label: 'Travel Coordinator' },
                { email: 'finance@travel.local',     label: 'Finance Manager' },
                { email: 'manager@travel.local',     label: 'Line Manager' },
                { email: 'employee@travel.local',    label: 'Employee' },
              ].map(({ email, label }) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => fillDemo(email)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0', color: '#2b6cb0', fontSize: 12 }}
                >
                  <code style={{ color: '#2b6cb0' }}>{email}</code>
                  <span style={{ color: '#718096', marginLeft: 6 }}>— {label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.co.za"
              required
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••••"
              required
            />
          </div>

          {error && (
            <div style={{ background: '#fed7d7', color: '#822727', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px', background: 'var(--primary)', color: '#fff',
              borderRadius: 6, fontWeight: 600, fontSize: 15, opacity: loading ? 0.7 : 1,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
