import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

const MOCK = process.env.REACT_APP_MOCK === 'true';

const MOCK_USERS = {
  'admin@travel.local':       { role: 'admin',              name: 'Admin User' },
  'coordinator@travel.local': { role: 'travel_coordinator', name: 'Travel Coordinator' },
  'finance@travel.local':     { role: 'finance',            name: 'Finance Manager' },
  'manager@travel.local':     { role: 'manager',            name: 'Line Manager' },
  'employee@travel.local':    { role: 'employee',           name: 'Jane Employee' },
};

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  if (MOCK) {
    const mock = MOCK_USERS[email.toLowerCase()];
    if (!mock || password !== 'password') {
      return rejectWithValue('Invalid credentials. Try coordinator@travel.local / password');
    }
    return { email, role: mock.role, name: mock.name, employeeId: 'mock-emp-001', department: 'Engineering' };
  }
  try {
    await signIn({ username: email, password });
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload || {};
    return {
      email,
      role:       payload['custom:role'] || 'employee',
      employeeId: payload['custom:employee_id'],
      department: payload['custom:department'],
      name:       payload.name || email,
    };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  if (!MOCK) await signOut();
});

export const restoreSession = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  if (MOCK) {
    const saved = sessionStorage.getItem('mock_travel_user');
    if (saved) return JSON.parse(saved);
    return rejectWithValue('No session');
  }
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload || {};
    return {
      email:      user.username,
      role:       payload['custom:role'] || 'employee',
      employeeId: payload['custom:employee_id'],
      department: payload['custom:department'],
      name:       payload.name || user.username,
    };
  } catch {
    return rejectWithValue('No session');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, error: null, initialized: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(login.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; if (MOCK) sessionStorage.setItem('mock_travel_user', JSON.stringify(a.payload)); })
      .addCase(login.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(logout.fulfilled, (s) => { s.user = null; sessionStorage.removeItem('mock_travel_user'); })
      .addCase(restoreSession.fulfilled, (s, a) => { s.user = a.payload; s.initialized = true; })
      .addCase(restoreSession.rejected,  (s) => { s.initialized = true; });
  },
});

export default authSlice.reducer;
