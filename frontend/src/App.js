import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { restoreSession } from './store/slices/authSlice';

import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import TravelRequestsPage from './pages/requests/TravelRequestsPage';
import TravelRequestDetailPage from './pages/requests/TravelRequestDetailPage';
import ApprovalsPage from './pages/approvals/ApprovalsPage';
import BookingsPage from './pages/bookings/BookingsPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import AdvisoriesPage from './pages/advisories/AdvisoriesPage';
import ReportsPage from './pages/reports/ReportsPage';

function PrivateRoute({ children }) {
  const { user, initialized } = useSelector((s) => s.auth);
  if (!initialized) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(restoreSession()); }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"      element={<DashboardPage />} />
          <Route path="requests"       element={<TravelRequestsPage />} />
          <Route path="requests/:id"   element={<TravelRequestDetailPage />} />
          <Route path="approvals"      element={<ApprovalsPage />} />
          <Route path="bookings"       element={<BookingsPage />} />
          <Route path="expenses"       element={<ExpensesPage />} />
          <Route path="documents"      element={<DocumentsPage />} />
          <Route path="advisories"     element={<AdvisoriesPage />} />
          <Route path="reports"        element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
