import axios from 'axios';
import { log } from '../utils/logger';
import { deleteStoredItem, getStoredItem, setStoredItem } from '../utils/storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://web-production-fa250.up.railway.app';

export { BASE_URL };

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const raw = await getStoredItem('tokens');
      if (raw) {
        const { access_token } = JSON.parse(raw);
        if (access_token) config.headers.Authorization = `Bearer ${access_token}`;
      }
    } catch (err) {
      log.warn('request interceptor: could not read tokens', err?.message);
    }
    log.debug(`→ ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (err) => {
    log.error('request interceptor', err);
    return Promise.reject(err);
  }
);

api.interceptors.response.use(
  (res) => {
    log.debug(`← ${res.status} ${res.config.url}`);
    return res;
  },
  async (err) => {
    const original = err.config;
    const status = err.response?.status;
    const url = original?.url || '';
    const isAuthEndpoint = url.startsWith('/auth/login')
      || url.startsWith('/auth/signup')
      || url.startsWith('/auth/forgot-password')
      || url.startsWith('/auth/reset-password')
      || url.startsWith('/auth/refresh');

    log.debug(`← ${status ?? 'NO_RESPONSE'} ${original?.url}`);

    if (status === 401 && !isAuthEndpoint && !original._retried) {
      original._retried = true;
      log.info('access token expired — attempting refresh');

      try {
        const raw = await getStoredItem('tokens');
        if (!raw) throw new Error('no tokens in storage');

        const { refresh_token } = JSON.parse(raw);
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token });

        await setStoredItem('tokens', JSON.stringify(data));
        original.headers.Authorization = `Bearer ${data.access_token}`;

        log.info('token refreshed — retrying original request');
        return api(original);
      } catch (refreshErr) {
        log.warn('token refresh failed — clearing session', refreshErr?.message);
        await deleteStoredItem('tokens').catch(() => {});
        await deleteStoredItem('user').catch(() => {});
      }
    }

    if (status !== 401) log.error(`API error on ${original?.url}`, err);
    return Promise.reject(err);
  }
);
