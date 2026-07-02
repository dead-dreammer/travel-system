import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { MOCK_DATA } from './mockData';

const MOCK = process.env.REACT_APP_MOCK === 'true';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
});

if (MOCK) {
  api.interceptors.request.use((config) => {
    const rawPath = config.url?.replace(config.baseURL || '', '') || config.url || '';
    const pathNoQuery = rawPath.split('?')[0];
    const mockResponse = MOCK_DATA[rawPath] ?? MOCK_DATA[pathNoQuery];
    if (mockResponse !== undefined) {
      config.adapter = () => Promise.resolve({ data: { success: true, data: mockResponse }, status: 200, statusText: 'OK', headers: {}, config });
    } else if (config.method !== 'get') {
      config.adapter = () => Promise.resolve({ data: { success: true, data: { message: 'Mock: action recorded', id: 'mock-' + Date.now() } }, status: 200, statusText: 'OK', headers: {}, config });
    }
    return config;
  });
} else {
  api.interceptors.request.use(async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (token) config.headers.Authorization = token;
    } catch {}
    return config;
  });
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!MOCK && err.response?.status === 401) window.location.href = '/login';
    return Promise.reject(err);
  }
);

export default api;
