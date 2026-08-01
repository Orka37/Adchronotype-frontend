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
            <Feather name="chevron-left" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Feather name="lock" size={28} color="#c8b8ff" />
          </View>

          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email or username. If an account exists, reset instructions will be sent.
          </Text>

          <Text style={styles.label}>Email or Username</Text>
          <View style={[styles.inputRow, focused && styles.inputFocused]}>
            <Feather name="mail" size={18} color={focused ? '#7c3aed' : '#6c7094'} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, webInputReset]}
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              placeholder="Enter email or username"
              placeholderTextColor="#4a5270"
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
              <Feather name="check-circle" size={18} color="#00c9b1" />
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
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Send Reset Instructions</Text>
            }
          </TouchableOpacity>

          <Pressable style={styles.returnLink} onPress={() => navigation.goBack()}>
            <Text style={styles.returnText}>Back to login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F1A' },
  safeTop: { flex: 0, backgroundColor: '#0B0F1A', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 50 },
  iconWrap: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#7c3aed22', borderWidth: 1, borderColor: '#7c3aed44', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 10 },
  subtitle: { color: '#8c91b5', fontSize: 15, lineHeight: 23, marginBottom: 34 },
  label: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  inputRow: { height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: '#1f254f', backgroundColor: '#161b3d', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 16 },
  inputFocused: { borderColor: '#7c3aed' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#00c9b111', borderWidth: 1, borderColor: '#00c9b133', borderRadius: 12, padding: 12, marginBottom: 18 },
  noticeText: { flex: 1, color: '#a0a3b8', fontSize: 13, lineHeight: 19 },
  btn: { height: 54, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: '#3b2d6e' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  returnLink: { alignItems: 'center', marginTop: 24, padding: 8 },
  returnText: { color: '#7c3aed', fontSize: 14, fontWeight: '700' },
});
