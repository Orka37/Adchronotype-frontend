import { deleteStoredItem, getStoredItem, setStoredItem } from './storage';

export const TERMS_VERSION = '2026-08-16';
export const PRIVACY_VERSION = '2026-08-16';

const DEVICE_CONSENT_KEY = 'legal_consent';
const PENDING_CONSENT_KEY = 'pending_legal_consent';

export function accountConsentKey(user) {
  return `legal_consent_${user?.id || user?.username}`;
}

export function isCurrentLegalConsent(value) {
  if (!value) return false;
  try {
    const consent = typeof value === 'string' ? JSON.parse(value) : value;
    return consent.termsVersion === TERMS_VERSION
      && consent.privacyVersion === PRIVACY_VERSION;
  } catch {
    return false;
  }
}

export function createLegalConsentRecord() {
  return {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedAt: new Date().toISOString(),
  };
}

export async function recordPreAuthLegalConsent() {
  const record = createLegalConsentRecord();
  const serialized = JSON.stringify(record);
  await setStoredItem(DEVICE_CONSENT_KEY, serialized);
  await setStoredItem(PENDING_CONSENT_KEY, serialized);
  return record;
}

export async function hasCurrentDeviceConsent() {
  return isCurrentLegalConsent(await getStoredItem(DEVICE_CONSENT_KEY));
}

export async function consumePendingConsentForUser(user) {
  const pending = await getStoredItem(PENDING_CONSENT_KEY);
  if (!isCurrentLegalConsent(pending)) return false;
  await setStoredItem(accountConsentKey(user), pending);
  await deleteStoredItem(PENDING_CONSENT_KEY);
  return JSON.parse(pending);
}

export async function hasCurrentAccountConsent(user) {
  if (!user) return false;
  return isCurrentLegalConsent(await getStoredItem(accountConsentKey(user)));
}

export async function recordAccountLegalConsent(user) {
  if (!user) return;
  const serialized = JSON.stringify(createLegalConsentRecord());
  await setStoredItem(accountConsentKey(user), serialized);
  await setStoredItem(DEVICE_CONSENT_KEY, serialized);
  await deleteStoredItem(PENDING_CONSENT_KEY).catch(() => {});
}

export async function cacheAccountLegalConsent(user, consent) {
  if (!user || !isCurrentLegalConsent(consent)) return false;
  const serialized = JSON.stringify(consent);
  await setStoredItem(accountConsentKey(user), serialized);
  await setStoredItem(DEVICE_CONSENT_KEY, serialized);
  return true;
}
