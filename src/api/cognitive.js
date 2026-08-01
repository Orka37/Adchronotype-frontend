import { api } from './config';

export async function submitCognitiveTest(result) {
  const res = await api.post('/cognitive-tests', result);
  return res.data;
}

export async function submitAllCognitiveTests(results) {
  const created = [];

  for (const result of results) {
    const record = await submitCognitiveTest(result);
    created.push(record);
  }

  return created;
}

export async function getCognitiveTests(testType, page = 1) {
  const params = { page, page_size: 30 };
  if (testType) params.test_type = testType;

  const res = await api.get('/cognitive-tests', { params });
  return res.data;
}

export async function getPersonalBests() {
  const res = await api.get('/cognitive-tests/personal-bests');
  return res.data;
}

export async function getCognitiveStatus() {
  const res = await api.get('/cognitive-tests/status');
  return res.data;
}
