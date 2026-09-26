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
import { requestPasswordReset } from '../api/auth';
import { log } from '../utils/logger';

const webInputReset = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const value = emailOrUsername.trim();
    if (!value) {
      Alert.alert('Missing information', 'Enter your email or username to continue.');
      return;
    }

    try {
      setSubmitting(true);
      Keyboard.dismiss();
      await requestPasswordReset({ emailOrUsername: value });
      log.info('ForgotPasswordScreen: reset requested');
    } catch (err) {
      log.warn('ForgotPasswordScreen: reset endpoint unavailable or request failed', err?.message);
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={26} color={colors.secondary} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Feather name="lock" size={28} color={colors.accent} />
          </View>

          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email or username. If an account exists, reset instructions will be sent.
          </Text>

          <Text style={styles.label}>Email or Username</Text>
          <View style={[styles.inputRow, focused && styles.inputFocused]}>
            <Feather name="mail" size={18} color={focused ? colors.accent : colors.secondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, webInputReset]}
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              placeholder="Enter email or username"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="done"
              blurOnSubmit={false}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </View>

          {sent && (
            <View style={styles.notice}>
              <Feather name="check-circle" size={18} color="#7EC49A" />
              <Text style={styles.noticeText}>
                If this account exists, reset instructions will be sent shortly.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color={colors.onBrand} />
              : <Text style={styles.btnText}>Send Reset Instructions</Text>
            }
          </TouchableOpacity>

          <Pressable style={styles.returnLink} onPress={() => navigation.goBack()}>
            <Text style={styles.returnText}>Back to Login</Text>
          </Pressable>
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
  inputFocused: { borderColor: colors.accent },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#7EC49A11', borderWidth: 1, borderColor: '#7EC49A33', borderRadius: 12, padding: 12, marginBottom: 18 },
  noticeText: { flex: 1, color: colors.secondary, fontSize: 13, lineHeight: 19 },
  btn: { height: 54, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: colors.disabled },
  btnText: { color: colors.onBrand, fontSize: 16, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  returnLink: { alignItems: 'center', marginTop: 24, padding: 8 },
  returnText: { color: colors.accent, fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
});
