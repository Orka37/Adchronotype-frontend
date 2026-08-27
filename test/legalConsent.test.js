import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  cacheAccountLegalConsent,
  clearLegalConsentAfterAccountDeletion,
  consumePendingConsentForUser,
  isCurrentLegalConsent,
  recordPreAuthLegalConsent,
} from '../src/utils/legalConsent';
import * as storage from '../src/utils/storage';

jest.mock('../src/utils/storage', () => ({
  deleteStoredItem: jest.fn(),
  getStoredItem: jest.fn(),
  setStoredItem: jest.fn(),
}));

const user = { id: 'user-1', username: 'ada' };

describe('legal consent storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.setStoredItem.mockResolvedValue(undefined);
    storage.deleteStoredItem.mockResolvedValue(undefined);
  });

  test('recognizes only the current legal document versions', () => {
    expect(isCurrentLegalConsent({ termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION })).toBe(true);
    expect(isCurrentLegalConsent('{bad json')).toBe(false);
    expect(isCurrentLegalConsent({ termsVersion: 'old', privacyVersion: PRIVACY_VERSION })).toBe(false);
  });

  test('records pre-auth consent for the device and pending account assignment', async () => {
    const consent = await recordPreAuthLegalConsent();

    expect(isCurrentLegalConsent(consent)).toBe(true);
    expect(storage.setStoredItem).toHaveBeenCalledWith('legal_consent', expect.any(String));
    expect(storage.setStoredItem).toHaveBeenCalledWith('pending_legal_consent', expect.any(String));
  });

  test('consumes a valid pending record for the authenticated account', async () => {
    const pending = JSON.stringify({ termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION });
    storage.getStoredItem.mockResolvedValue(pending);

    await expect(consumePendingConsentForUser(user)).resolves.toEqual(JSON.parse(pending));
    expect(storage.setStoredItem).toHaveBeenCalledWith('legal_consent_user-1', pending);
    expect(storage.deleteStoredItem).toHaveBeenCalledWith('pending_legal_consent');
  });

  test('does not cache obsolete consent and clears all account deletion records', async () => {
    await expect(cacheAccountLegalConsent(user, { termsVersion: 'old', privacyVersion: PRIVACY_VERSION })).resolves.toBe(false);
    expect(storage.setStoredItem).not.toHaveBeenCalled();

    await clearLegalConsentAfterAccountDeletion(user);
    expect(storage.deleteStoredItem).toHaveBeenCalledWith('legal_consent_user-1');
    expect(storage.deleteStoredItem).toHaveBeenCalledWith('legal_consent');
    expect(storage.deleteStoredItem).toHaveBeenCalledWith('pending_legal_consent');
  });
});
