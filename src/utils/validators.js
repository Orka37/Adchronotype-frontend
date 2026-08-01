export function validateEmail(val) {
  if (!val.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return 'Enter a valid email address.';
  return null;
}

export function validateUsername(val) {
  if (!val.trim()) return 'Username is required.';
  if (val.trim().length < 3) return 'Username must be at least 3 characters.';
  if (val.trim().length > 50) return 'Username must be 50 characters or fewer.';
  if (!/^[a-zA-Z0-9_]+$/.test(val.trim())) return 'Letters, numbers, and underscores only.';
  return null;
}

export function validatePassword(val) {
  if (!val) return 'Password is required.';
  if (val.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

export function validateRequired(val, label) {
  if (!val || !String(val).trim()) return `${label} is required.`;
  return null;
}
