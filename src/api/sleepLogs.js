import { api } from './config';

export async function createSleepLog(payload) {
  const res = await api.post('/sleep-logs', payload);
  return res.data;
}

export async function getSleepLogs(page = 1) {
  const res = await api.get('/sleep-logs', { params: { page, page_size: 60 } });
  return res.data;
}

export async function deleteSleepLog(logId) {
  await api.delete(`/sleep-logs/${logId}`);
}
