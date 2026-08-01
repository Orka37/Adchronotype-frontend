import { api } from './config';

export const CAREGIVER_MESSAGES = [
  { key: 'sleep_log_reminder', label: 'Log sleep', text: 'Please remember to log your sleep today.' },
  { key: 'doctor_report_reminder', label: 'Doctor report', text: 'Please export your doctor report before your next appointment.' },
  { key: 'cognitive_test_reminder', label: 'Cognitive test', text: 'Please complete your cognitive tests when you have time.' },
  { key: 'score_check_in', label: 'Check-in', text: 'I noticed your score changed. How are you feeling today?' },
  { key: 'great_progress', label: 'Encourage', text: 'Great progress. Keep going with your routine.' },
  { key: 'general_check_in', label: 'General', text: 'Thinking of you. Let me know if you need support.' },
];

export async function updateCaregiverSearch(enabled) {
  const res = await api.patch('/users/me/privacy', { caregiverSearchEnabled: enabled });
  return res.data;
}

export async function searchCaregivers(username) {
  const res = await api.get('/caregivers/search', { params: { username } });
  return res.data;
}

export async function sendCaregiverRequest(username) {
  const res = await api.post('/caregivers/requests', { username });
  return res.data;
}

export async function getIncomingCaregiverRequests() {
  const res = await api.get('/caregivers/requests/incoming');
  return res.data;
}

export async function getOutgoingCaregiverRequests() {
  const res = await api.get('/caregivers/requests/outgoing');
  return res.data;
}

export async function acceptCaregiverRequest(linkId) {
  const res = await api.post(`/caregivers/requests/${linkId}/accept`);
  return res.data;
}

export async function rejectCaregiverRequest(linkId) {
  const res = await api.post(`/caregivers/requests/${linkId}/reject`);
  return res.data;
}

export async function getCaregiverConnections() {
  const res = await api.get('/caregivers/connections');
  return res.data;
}

export async function removeCaregiverConnection(linkId) {
  await api.delete(`/caregivers/${linkId}`);
}

export async function getCaregiverStats(userId) {
  const res = await api.get(`/caregivers/connections/${userId}/stats`);
  return res.data;
}

export async function sendCaregiverMessage(userId, messageKey) {
  const res = await api.post(`/caregivers/connections/${userId}/messages`, { message_key: messageKey });
  return res.data;
}

export async function getCaregiverMessages(userId) {
  const res = await api.get(`/caregivers/connections/${userId}/messages`);
  return res.data;
}
