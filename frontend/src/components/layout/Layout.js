import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import {
  LayoutDashboard, Plane, CheckSquare, Calendar, Receipt,
  FileText, AlertTriangle, BarChart2, LogOut, Menu, X,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Travel',
    items: [
      { to: '/dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
      { to: '/requests',   label: 'My Requests',      icon: Plane },
      { to: '/approvals',  label: 'Approvals',        icon: CheckSquare },
    ],
  },
  {
    label: 'Bookings',
    items: [
      { to: '/bookings',   label: 'Flights & Hotels', icon: Calendar },
      { to: '/expenses',   label: 'Expenses',         icon: Receipt },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/documents',  label: 'Travel Documents', icon: FileText },
      { to: '/advisories', label: 'Advisories',       icon: AlertTriangle },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/reports',    label: 'Reports',          icon: BarChart2 },
    ],
  },
];

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 220 : 56,
        background: 'var(--primary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .2s',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* Logo / toggle */}
        <div style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,.1)', flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', color: '#fff', padding: 4, display: 'flex', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          {sidebarOpen && <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>Travel Management</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {navGroups.map(({ label, items }) => (
            <div key={label}>
              {sidebarOpen && (
                <div style={{ padding: '10px 12px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  {label}
                </div>
              )}
              {!sidebarOpen && <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', margin: '6px 0' }} />}
              {items.map(({ to, label: itemLabel, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 12px',
                    color: isActive ? '#fff' : 'rgba(255,255,255,.65)',
                    background: isActive ? 'rgba(255,255,255,.15)' : 'none',
                    textDecoration: 'none',
                    fontSize: 13,
                    transition: 'all .15s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  })}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {sidebarOpen && <span>{itemLabel}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User + sign out */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.1)', flexShrink: 0 }}>
          {sidebarOpen && (
            <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 11, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 600, color: '#fff' }}>{user?.name || user?.email}</div>
              <div style={{ textTransform: 'capitalize' }}>{user?.role?.replace(/_/g, ' ')}</div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'rgba(255,255,255,.7)', background: 'none', padding: '6px 0', width: '100%', fontSize: 13,
            border: 'none', cursor: 'pointer',
          }}>
            <LogOut size={15} />
            {sidebarOpen && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
