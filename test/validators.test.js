import {
  validateEmail,
  validatePassword,
  validateRequired,
  validateUsername,
} from '../src/utils/validators';

describe('form validators', () => {
  test.each([
    ['', 'Email is required.'],
    ['missing-at-sign', 'Enter a valid email address.'],
    [' member@example.com ', null],
  ])('validates email %p', (value, expected) => {
    expect(validateEmail(value)).toBe(expected);
  });

  test.each([
    ['', 'Username is required.'],
    ['ab', 'Username must be at least 3 characters.'],
    ['user-name', 'Letters, numbers, and underscores only.'],
    ['valid_user_1', null],
  ])('validates username %p', (value, expected) => {
    expect(validateUsername(value)).toBe(expected);
  });

  test('validates passwords and required values', () => {
    expect(validatePassword('')).toBe('Password is required.');
    expect(validatePassword('short')).toBe('Password must be at least 8 characters.');
    expect(validatePassword('long-enough')).toBeNull();
    expect(validateRequired('  ', 'First name')).toBe('First name is required.');
    expect(validateRequired('Ada', 'First name')).toBeNull();
  });
});
