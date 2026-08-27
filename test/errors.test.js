import axios from 'axios';
import { parseApiError } from '../src/utils/errors';

describe('parseApiError', () => {
  test('returns a timeout-specific message', () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    expect(parseApiError({ code: 'ECONNABORTED' })).toMatch(/timed out/i);
  });

  test.each([
    [401, {}, 'Incorrect credentials.'],
    [403, { detail: 'ignored' }, 'You do not have permission to do that.'],
    [422, { detail: [{ msg: 'Invalid time' }] }, 'Invalid time'],
    [429, {}, 'Too many attempts. Please wait a moment.'],
  ])('maps HTTP %i to a safe user-facing message', (status, data, expected) => {
    expect(parseApiError({ response: { status, data } })).toBe(expected);
  });
});
