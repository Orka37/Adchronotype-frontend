import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { logoutUser } from '../api/auth';
import { getLegalConsent, saveLegalConsent } from '../api/users';
import { log } from '../utils/logger';
import { deleteStoredItem, getStoredItem, setStoredItem } from '../utils/storage';
import {
  consumePendingConsentForUser,
  cacheAccountLegalConsent,
  hasCurrentAccountConsent,
  isCurrentLegalConsent,
  recordAccountLegalConsent,
  TERMS_VERSION,
  PRIVACY_VERSION,
} from '../utils/legalConsent';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [consentShown,  setConsentShown]  = useState(false);
  const [welcomeShown,  setWelcomeShown]  = useState(false);

  useEffect(() => { restoreSession(); }, []);

  async function syncConsentFromBackend(userData) {
    try {
      const serverConsent = await getLegalConsent();
      if (!isCurrentLegalConsent(serverConsent)) return false;
      await cacheAccountLegalConsent(userData, serverConsent);
      return true;
    } catch (err) {
      log.warn('legal consent sync failed; using local fallback', err?.message);
      return hasCurrentAccountConsent(userData);
    }
  }

  async function saveConsentToBackend(userData) {
    const saved = await saveLegalConsent({
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      platform: Platform.OS,
      appVersion: '1.0.0',
    });
    await cacheAccountLegalConsent(userData, saved);
    return saved;
  }

  async function restoreSession() {
    try {
      const stored = await getStoredItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        setConsentShown(await syncConsentFromBackend(u));
        log.debug('session restored', u.username);
      }
    } catch (err) {
      log.error('restoreSession', err);
      await deleteStoredItem('user').catch(() => {});
      await deleteStoredItem('tokens').catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  async function signIn(userData, tokens) {
    try {
      if (tokens) await setStoredItem('tokens', JSON.stringify(tokens));
      await setStoredItem('user', JSON.stringify(userData));
      setUser(userData);
      const acceptedNow = await consumePendingConsentForUser(userData);
      if (acceptedNow) {
        try {
          await saveConsentToBackend(userData);
        } catch (err) {
          log.warn('could not upload new legal consent; retained local record', err?.message);
        }
        setConsentShown(true);
      } else {
        setConsentShown(await syncConsentFromBackend(userData));
      }
      setWelcomeShown(false); // reset welcome popup for each new session
      log.info('signed in', userData.username);
    } catch (err) {
      log.error('signIn: failed to persist session', err);
      setUser(userData);
    }
  }

  async function markConsentGiven() {
    try {
      if (user) {
        try {
          await saveConsentToBackend(user);
        } catch (err) {
          log.warn('could not upload legal consent; retained local record', err?.message);
          await recordAccountLegalConsent(user);
        }
      }
      setConsentShown(true);
    } catch (err) {
      log.warn('markConsentGiven: could not persist', err?.message);
      setConsentShown(true);
    }
  }

  function markWelcomeShown() {
    setWelcomeShown(true);
  }

  async function signOut(options = {}) {
    try {
      const raw = options.skipServerLogout ? null : await getStoredItem('tokens');
      if (raw) {
        const { refresh_token } = JSON.parse(raw);
        await logoutUser(refresh_token);
        log.info('refresh token revoked');
      }
    } catch (err) {
      log.warn('signOut: server revocation failed', err?.message);
    } finally {
      setUser(null);
      setConsentShown(false);
      setWelcomeShown(false);
      await deleteStoredItem('user').catch(() => {});
      await deleteStoredItem('tokens').catch(() => {});
      log.info('local session cleared');
    }
  }

  return (
    <AuthContext.Provider value={{
      user, loading, signIn, signOut,
      consentShown, markConsentGiven,
      welcomeShown, markWelcomeShown,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
