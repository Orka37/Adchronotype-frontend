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

// Patient-centered caregiver access. The legacy connection functions above are
// retained temporarily so older app builds remain compatible with the backend.
export async function createCarePatient(displayName) {
  const res = await api.post('/care-patients', { display_name: displayName });
  return res.data;
}

export async function getCarePatients() {
  const res = await api.get('/care-patients');
  return res.data;
}

export async function getCarePatient(patientId) {
  const res = await api.get(`/care-patients/${patientId}`);
  return res.data;
}

export async function updateCarePatient(patientId, displayName) {
  const res = await api.patch(`/care-patients/${patientId}`, { display_name: displayName });
  return res.data;
}

export async function getCarePatientMembers(patientId) {
  const res = await api.get(`/care-patients/${patientId}/members`);
  return res.data;
}

export async function inviteCarePatientHelper(patientId, target) {
  const payload = target.includes('@') ? { email: target } : { username: target.replace(/^@/, '') };
  const res = await api.post(`/care-patients/${patientId}/invitations`, payload);
  return res.data;
}

export async function getCarePatientInvitations(patientId) {
  const res = await api.get(`/care-patients/${patientId}/invitations`);
  return res.data;
}

export async function getIncomingCarePatientInvitations() {
  const res = await api.get('/care-patients/invitations/incoming');
  return res.data;
}

export async function acceptCarePatientInvitation(invitationId) {
  const res = await api.post(`/care-patients/invitations/${invitationId}/accept`);
  return res.data;
}

export async function declineCarePatientInvitation(invitationId) {
  const res = await api.post(`/care-patients/invitations/${invitationId}/decline`);
  return res.data;
}

export async function cancelCarePatientInvitation(invitationId) {
  await api.delete(`/care-patients/invitations/${invitationId}`);
}

export async function revokeCarePatientMember(patientId, memberId) {
  await api.delete(`/care-patients/${patientId}/members/${memberId}`);
}

export async function createCarePatientEvent(patientId, eventType, eventTime, note) {
  const res = await api.post(`/care-patients/${patientId}/events`, {
    event_type: eventType,
    event_time: eventTime,
    note: note?.trim() || null,
  });
  return res.data;
}

export async function getCarePatientEvents(patientId, params = {}) {
  const res = await api.get(`/care-patients/${patientId}/events`, { params });
  return res.data;
}

export async function updateCarePatientEvent(patientId, eventId, updates) {
  const res = await api.patch(`/care-patients/${patientId}/events/${eventId}`, updates);
  return res.data;
}

export async function deleteCarePatientEvent(patientId, eventId) {
  await api.delete(`/care-patients/${patientId}/events/${eventId}`);
}

export async function getCarePatientRoutine(patientId) {
  const res = await api.get(`/care-patients/${patientId}/routine`);
  return res.data;
}

export async function saveCarePatientRoutine(patientId, routine) {
  const res = await api.put(`/care-patients/${patientId}/routine`, routine);
  return res.data;
}

export async function createCarePatientHandoffNote(patientId, tags, note) {
  const res = await api.post(`/care-patients/${patientId}/handoff-notes`, {
    tags,
    note: note?.trim() || null,
  });
  return res.data;
}

export async function getCarePatientHandoffNotes(patientId, params = {}) {
  const res = await api.get(`/care-patients/${patientId}/handoff-notes`, { params });
  return res.data;
}

export async function updateCarePatientHandoffNote(patientId, noteId, tags, note) {
  const res = await api.patch(`/care-patients/${patientId}/handoff-notes/${noteId}`, {
    tags,
    note: note?.trim() || null,
  });
  return res.data;
}

export async function deleteCarePatientHandoffNote(patientId, noteId) {
  await api.delete(`/care-patients/${patientId}/handoff-notes/${noteId}`);
}

export async function getCarePatientDailySummaries(patientId, days = 7) {
  const res = await api.get(`/care-patients/${patientId}/daily-summaries`, { params: { days } });
  return res.data;
}

export async function createCaregiverWellnessCheckIn(payload) {
  const res = await api.post('/care-patients/wellness/check-ins', payload);
  return res.data;
}

export async function getCaregiverWellnessSummary(days = 7) {
  const res = await api.get('/care-patients/wellness/summary', { params: { days } });
  return res.data;
}

export async function createCarePatientMedicationSchedule(patientId, payload) {
  const res = await api.post(`/care-patients/${patientId}/medications`, payload);
  return res.data;
}

export async function getCarePatientMedicationSchedules(patientId, activeOnly = true) {
  const res = await api.get(`/care-patients/${patientId}/medications`, { params: { active_only: activeOnly } });
  return res.data;
}

export async function updateCarePatientMedicationSchedule(patientId, scheduleId, payload) {
  const res = await api.patch(`/care-patients/${patientId}/medications/${scheduleId}`, payload);
  return res.data;
}

export async function deleteCarePatientMedicationSchedule(patientId, scheduleId) {
  await api.delete(`/care-patients/${patientId}/medications/${scheduleId}`);
}

export async function createCarePatientMedicationLog(patientId, scheduleId, status, note) {
  const res = await api.post(`/care-patients/${patientId}/medications/${scheduleId}/logs`, {
    status, occurred_at: new Date().toISOString(), note: note?.trim() || null,
  });
  return res.data;
}

export async function getCarePatientMedicationLogs(patientId, limit = 100) {
  const res = await api.get(`/care-patients/${patientId}/medication-logs`, { params: { limit } });
  return res.data;
}
