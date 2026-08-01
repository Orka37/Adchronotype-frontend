import React, { createContext, useContext, useEffect, useState } from 'react';
import { logoutUser } from '../api/auth';
import { log } from '../utils/logger';
import { deleteStoredItem, getStoredItem, setStoredItem } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [consentShown,  setConsentShown]  = useState(false);
  const [welcomeShown,  setWelcomeShown]  = useState(false);

  useEffect(() => { restoreSession(); }, []);

  async function restoreSession() {
    try {
      const stored = await getStoredItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        // consent is per-account — stored with username key
        const key = `consent_${u.username}`;
        const shown = await getStoredItem(key);
        setConsentShown(shown === 'true');
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
      // check if this user already consented
      const key = `consent_${userData.username}`;
      const shown = await getStoredItem(key);
      setConsentShown(shown === 'true');
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
        await setStoredItem(`consent_${user.username}`, 'true');
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

  async function signOut() {
    try {
      const raw = await getStoredItem('tokens');
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
