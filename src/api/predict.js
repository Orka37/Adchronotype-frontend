import { api } from './config';

export async function predictBrainHealth(payload) {
  const res = await api.post('/predictions', payload);
  return res.data;
}

export async function getPredictions(page = 1) {
  const res = await api.get('/predictions', { params: { page, page_size: 20 } });
  return res.data;
}
