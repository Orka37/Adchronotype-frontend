import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Appearance, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { getStoredItem, setStoredItem } from '../utils/storage';
import { darkColors, lightColors } from '../theme/palette';

export const THEME_STORAGE_KEY = 'adchronotype.appearance';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const [ready, setReady] = useState(false);
  const colors = mode === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    let mounted = true;
    getStoredItem(THEME_STORAGE_KEY)
      .then(saved => { if (mounted) setMode(saved === 'dark' ? 'dark' : 'light'); })
      .catch(() => { /* An unavailable preference store falls back to light. */ })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Explicitly override device appearance: there is no System option.
    if (Platform.OS !== 'web') Appearance.setColorScheme(mode);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = mode;
      document.documentElement.style.backgroundColor = colors.background;
      document.body.style.backgroundColor = colors.background;
    }
  }, [mode, colors, ready]);

  const setThemeMode = useCallback(async nextMode => {
    if (nextMode !== 'light' && nextMode !== 'dark') throw new Error('Choose Light or Dark.');
    // Persist before confirming the change so a failed write is never reported as saved.
    await setStoredItem(THEME_STORAGE_KEY, nextMode);
    setMode(nextMode);
  }, []);

  const navigationTheme = useMemo(() => ({
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  }), [mode, colors]);
  const value = useMemo(() => ({ mode, colors, setThemeMode, navigationTheme }), [mode, colors, setThemeMode, navigationTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {ready ? children : (
        <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Loading appearance" />
        </View>
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}

export function useThemedStyles(createStyles) {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [createStyles, colors]);
}
