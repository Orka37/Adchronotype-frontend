import { useTheme, useThemedStyles } from '../context/ThemeContext';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { resetPassword } from '../api/auth';
import { parseApiError } from '../utils/errors';
import { log } from '../utils/logger';

const webInputReset = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

export default function ResetPasswordScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const token = route?.params?.token || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [secure, setSecure] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!token) {
      Alert.alert('Invalid link', 'This reset link is missing a token. Please request a new password reset email.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Please re-enter the same password.');
      return;
    }

    try {
      setSubmitting(true);
      Keyboard.dismiss();
      await resetPassword({ token, new_password: password });
      setDone(true);
      log.info('ResetPasswordScreen: password reset completed');
    } catch (err) {
      log.error('ResetPasswordScreen.handleSubmit', err);
      Alert.alert('Reset failed', parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
            <Feather name="chevron-left" size={26} color={colors.secondary} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Feather name="key" size={28} color={colors.accent} />
          </View>

          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>Choose a new password for your ADChronotype account.</Text>

          {done ? (
            <View style={styles.doneCard}>
              <Feather name="check-circle" size={28} color="#7EC49A" />
              <Text style={styles.doneTitle}>Password updated</Text>
              <Text style={styles.doneText}>You can now log in with your new password.</Text>
              <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
                <Text style={styles.btnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputRow}>
                <Feather name="lock" size={18} color={colors.secondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, webInputReset]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                <Pressable onPress={() => setSecure(value => !value)} hitSlop={14} style={{ padding: 8 }}>
                  <Feather name={secure ? 'eye-off' : 'eye'} size={18} color={colors.secondary} />
                </Pressable>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputRow}>
                <Feather name="lock" size={18} color={colors.secondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, webInputReset]}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, submitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.btnText}>Update Password</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeTop: { flex: 0, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 50 },
  iconWrap: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent + '44', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { color: colors.text, fontSize: 28, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginBottom: 10 },
  subtitle: { color: colors.secondary, fontSize: 15, lineHeight: 23, marginBottom: 34 },
  label: { color: colors.text, fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', marginBottom: 8 },
  inputRow: { height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  btn: { height: 54, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: colors.disabled },
  btnText: { color: colors.onBrand, fontSize: 16, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  doneCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, alignItems: 'center' },
  doneTitle: { color: colors.text, fontSize: 19, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginTop: 12 },
  doneText: { color: colors.secondary, fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 18 },
});
