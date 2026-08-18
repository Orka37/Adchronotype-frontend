import { api } from './config';

export async function getMe() {
  const res = await api.get('/users/me');
  return res.data;
}

export async function updateMe(payload) {
  // payload: { firstName?, lastName? }
  const res = await api.patch('/users/me', payload);
  return res.data;
}

export async function changePassword(payload) {
  // payload: { current_password, new_password }
  await api.post('/users/me/change-password', payload);
}

export async function deleteAccount() {
  await api.delete('/users/me');
}

export async function getLegalConsent() {
  const res = await api.get('/users/me/legal-consent');
  return res.data;
}

export async function saveLegalConsent(payload) {
  const res = await api.post('/users/me/legal-consent', payload);
  return res.data;
}
