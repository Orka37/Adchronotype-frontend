import { useMemo } from 'react';
import { useTheme as useAppearance } from '../context/ThemeContext';

// Values transcribed from the supplied October 2026 design document.
// Scoped to redesigned screens so Cognitive Test retains its existing appearance.
const cache = new WeakMap();
export function useTheme() {
  const theme = useAppearance();
  if (!cache.has(theme.colors)) cache.set(theme.colors, theme.mode === 'dark' ? {...theme.colors, segmentSurface:theme.colors.tint} : {
    ...theme.colors,
    accent: '#C2571E', accentSoft: '#C2571E', brand: '#C2571E', brandSoft: '#C2571E',
    secondary: '#7A5F48', muted: '#9A8470', border: '#E8D9C8', outline: '#E8C9A8',
    warningBorder: '#EBD3A0', warningStrong: '#7A4F0E', warningBody: '#6B4A1C',
    successSurface: '#EAF5EC', successText: '#2F6B45', successBorder:'#BFE3CB', successLink:'#2F6B45', segmentSurface:'#EFE3D5', warningText:'#7A4F0E', neutralText:'#3D2B1F', neutralStrong:'#3D2B1F',
  });
  return { ...theme, colors: cache.get(theme.colors) };
}
export function useThemedStyles(factory) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
