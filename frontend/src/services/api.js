import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Warn loudly if VITE_API_URL is not set (will use relative '/api' which
// hits the frontend's own domain — guaranteed to fail in production)
if (!import.meta.env.VITE_API_URL) {
  console.warn(
    '[API] ⚠ VITE_API_URL is not set! API calls will go to relative "/api" path. ' +
    'In production, set VITE_API_URL to your API Gateway URL and REDEPLOY.'
  );
}
console.log(`[API] Base URL: ${API_BASE}`);

const api = axios.create({ baseURL: API_BASE, timeout: 60000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    // Guard: if the API returned HTML instead of JSON, the request
    // hit the wrong server (frontend static server instead of API Gateway)
    const contentType = res.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      console.error('[API] Received HTML instead of JSON — request likely hit the frontend server, not the API Gateway.');
      return Promise.reject(new Error(
        'Server configuration error: API request returned HTML. Check VITE_API_URL.'
      ));
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      const code = err.response?.data?.code;
      if (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') {
        clearSession();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

const SESSION_KEY = 'rag_session';
const SESSION_TTL = 24 * 60 * 60 * 1000;

export function saveSession(token, user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user, expiresAt: Date.now() + SESSION_TTL }));
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) { clearSession(); return null; }
    return session;
  } catch { return null; }
}

export function clearSession() { localStorage.removeItem(SESSION_KEY); }
export function isAuthenticated() { return !!getSession(); }

export const authAPI = {
  sendOTP: (data) => api.post('/auth/send-otp', data),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me')
};

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data)
};

export const chatAPI = {
  sendQuery: (query, sessionId) => api.post('/chat/send-query', { query, sessionId }),
  getHistory: (page = 1, limit = 20) => api.get(`/chat/history?page=${page}&limit=${limit}`),
  deleteChat: (chatId) => api.delete(`/chat/${chatId}`)
};

export const uploadAPI = {
  upload: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDocuments: () => api.get('/upload'),
  deleteDocument: (id) => api.delete(`/upload/${id}`)
};

export default api;
