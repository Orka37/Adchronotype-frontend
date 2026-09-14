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
            <Feather name="chevron-left" size={26} color="#8A6A4E" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Feather name="key" size={28} color="#E07B3C" />
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
                <Feather name="lock" size={18} color="#8A6A4E" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, webInputReset]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 characters"
                  placeholderTextColor="#B09A86"
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                <Pressable onPress={() => setSecure(value => !value)} hitSlop={14} style={{ padding: 8 }}>
                  <Feather name={secure ? 'eye-off' : 'eye'} size={18} color="#8A6A4E" />
                </Pressable>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputRow}>
                <Feather name="lock" size={18} color="#8A6A4E" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, webInputReset]}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#B09A86"
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
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF6F0' },
  safeTop: { flex: 0, backgroundColor: '#FDF6F0', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 50 },
  iconWrap: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#E07B3C22', borderWidth: 1, borderColor: '#E07B3C44', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { color: '#3D2B1F', fontSize: 28, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginBottom: 10 },
  subtitle: { color: '#8A6A4E', fontSize: 15, lineHeight: 23, marginBottom: 34 },
  label: { color: '#3D2B1F', fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', marginBottom: 8 },
  inputRow: { height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: '#F0E2D4', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#3D2B1F', fontSize: 15 },
  btn: { height: 54, borderRadius: 14, backgroundColor: '#E07B3C', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: '#C98B65' },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  doneCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F0E2D4', padding: 20, alignItems: 'center' },
  doneTitle: { color: '#3D2B1F', fontSize: 19, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginTop: 12 },
  doneText: { color: '#8A6A4E', fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 18 },
});
