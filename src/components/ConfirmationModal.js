import { useTheme, useThemedStyles } from '../context/ThemeContext';
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
            <Feather name={danger ? 'alert-triangle' : 'log-out'} size={24} color={danger ? '#D9694F' : colors.accentSoft} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, danger ? styles.dangerButton : styles.confirmButton]}
              onPress={onConfirm}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy
                ? <ActivityIndicator size="small" color={colors.onBrand} />
                : <Text style={styles.confirmText}>{confirmLabel}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, maxWidth: 440, padding: 24, width: '100%' },
  iconWrap: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.accent + '22', borderRadius: 24, height: 48, justifyContent: 'center', marginBottom: 16, width: 48 },
  iconWrapDanger: { backgroundColor: '#D9694F22' },
  title: { color: colors.text, fontSize: 21, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginBottom: 10, textAlign: 'center' },
  message: { color: colors.secondary, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  button: { alignItems: 'center', borderRadius: 12, flex: 1, height: 48, justifyContent: 'center' },
  cancelButton: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
  confirmButton: { backgroundColor: colors.brand },
  dangerButton: { backgroundColor: '#dc2626' },
  cancelText: { color: colors.neutralText, fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  confirmText: { color: colors.onBrand, fontSize: 14, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
});
