import { api } from './config';

export async function signupUser(payload) {
  const res = await api.post('/auth/signup', payload);
  return res.data;
}

export async function loginUser(payload) {
  const res = await api.post('/auth/login', payload);
  return res.data;
}

export async function logoutUser(refresh_token) {
  await api.post('/auth/logout', { refresh_token });
}

export async function requestPasswordReset(payload) {
  const res = await api.post('/auth/forgot-password', payload);
  return res.data;
}

export async function resetPassword(payload) {
  const res = await api.post('/auth/reset-password', payload);
  return res.data;
}

export async function checkUsername(username) {
  const res = await api.get('/auth/check-username', { params: { username } });
  return res.data;
}
