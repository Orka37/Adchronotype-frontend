import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../context/ThemeContext';

export default function AppearancePicker({ visible, onClose }) {
  const { colors, mode, setThemeMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function choose(nextMode) {
    if (saving || mode === nextMode) return;
    setSaving(true);
    setError('');
    try { await setThemeMode(nextMode); }
    catch { setError('Could not save your appearance. Please try again.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">Appearance</Text>
          <Text style={styles.description}>Choose how ADChronotype looks. Your choice is saved on this device.</Text>
          <View style={styles.options}>
            {['light', 'dark'].map(value => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                aria-checked={mode === value}
                accessibilityLabel={value === 'light' ? 'Light' : 'Dark'}
                accessibilityState={{ checked: mode === value, disabled: saving }}
                disabled={saving}
                onPress={() => choose(value)}
                style={[styles.option, mode === value && styles.selected]}
              >
                <Feather name={value === 'light' ? 'sun' : 'moon'} size={24} color={colors.accent} />
                <Text style={styles.optionText}>{value === 'light' ? 'Light' : 'Dark'}</Text>
                <Feather name={mode === value ? 'check-circle' : 'circle'} size={18} color={mode === value ? colors.accent : colors.muted} />
              </Pressable>
            ))}
          </View>
          {saving && <ActivityIndicator color={colors.accent} accessibilityLabel="Saving appearance" />}
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = colors => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  panel: { width: '100%', maxWidth: 440, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 22 },
  title: { color: colors.text, fontFamily: 'Lexend_700Bold', fontSize: 22, marginBottom: 8 },
  description: { color: colors.secondary, fontSize: 13, lineHeight: 21, marginBottom: 20 },
  options: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  option: { flex: 1, alignItems: 'center', gap: 12, paddingVertical: 20, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 2, borderRadius: 14 },
  selected: { borderColor: colors.accent, backgroundColor: colors.tint },
  optionText: { color: colors.text, fontFamily: 'Lexend_600SemiBold', fontSize: 15 },
  error: { color: colors.errorText, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  done: { backgroundColor: colors.brand, borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  doneText: { color: colors.onBrand, fontFamily: 'Lexend_600SemiBold', fontSize: 15 },
});
