import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL, timeout: 65000 });

let onUnauthorized = null;
let onSlowChange = null;
let hasCompletedRequest = false;
let pendingCount = 0;
let slowTimer = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export function setSlowHandler(fn) {
  onSlowChange = fn;
}

function startTrack() {
  pendingCount += 1;
  if (!hasCompletedRequest && !slowTimer) {
    slowTimer = setTimeout(() => {
      if (pendingCount > 0 && onSlowChange) onSlowChange(true);
    }, 2500);
  }
}

function endTrack() {
  pendingCount = Math.max(0, pendingCount - 1);
  if (pendingCount === 0) {
    if (slowTimer) {
      clearTimeout(slowTimer);
      slowTimer = null;
    }
    if (onSlowChange) onSlowChange(false);
  }
}

api.interceptors.request.use((config) => {
  startTrack();
  const token = localStorage.getItem('pocketbook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    hasCompletedRequest = true;
    endTrack();
    return res;
  },
  (err) => {
    endTrack();
    const status = err.response?.status;
    const url = err.config?.url || '';
    if (!err.response) {
      err.response = {
        data: {
          message: err.code === 'ECONNABORTED'
            ? 'The server took too long to respond. Please try again.'
            : 'Cannot reach the server. Check your connection and try again.',
        },
      };
    } else if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      localStorage.removeItem('pocketbook_token');
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export default api;
