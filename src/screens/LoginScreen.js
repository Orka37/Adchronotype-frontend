import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, SafeAreaView, Platform,
  KeyboardAvoidingView, ScrollView,
  Keyboard, Dimensions, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { loginUser } from '../api/auth';
import { parseApiError } from '../utils/errors';
import { log } from '../utils/logger';
import { useAuth } from '../context/AuthContext';

const { height } = Dimensions.get('window');
const webInputReset = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password,        setPassword]        = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [secureText,      setSecureText]      = useState(true);
  const [focused,         setFocused]         = useState(null);
  const [fieldErrors,     setFieldErrors]     = useState({});
  const [formError,       setFormError]       = useState('');

  function validate() {
    const errs = {};
    if (!emailOrUsername.trim()) errs.id = 'Email or username is required.';
    if (!password)               errs.pw = 'Password is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function clearErr(key) {
    if (fieldErrors[key]) setFieldErrors(p => ({ ...p, [key]: null }));
    if (formError) setFormError('');
  }

  async function handleLogin() {
    if (!validate()) return;
    try {
      setSubmitting(true);
      setFormError('');
      Keyboard.dismiss();
      const result = await loginUser({ emailOrUsername: emailOrUsername.trim(), password });
      log.info('login success', result.user?.username);
      await signIn(result.user, result.tokens);
    } catch (err) {
      log.error('LoginScreen.handleLogin', err);
      const message = parseApiError(err);
      setFormError(message === 'incorrect credentials' ? 'Incorrect username or password.' : message);
      if (Platform.OS !== 'web') {
        Alert.alert('Login failed', message === 'incorrect credentials' ? 'Incorrect username or password.' : message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const hasErr = (k) => !!fieldErrors[k];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            {/* Logo */}
            <View style={styles.logoWrap}>
              <Text style={styles.logoBold}>AD</Text>
              <Text style={styles.logoLight}>Chronotype</Text>
            </View>

            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to continue your brain health check.</Text>

            {/* Email / username */}
            <Text style={styles.label}>Email or Username</Text>
            <View style={[styles.inputRow, focused === 'id' && styles.inputFocused, hasErr('id') && styles.inputErr]}>
              <Feather name="mail" size={18} color={focused === 'id' ? '#E07B3C' : '#8A6A4E'} style={styles.icon} />
              <TextInput
                style={[styles.input, webInputReset]}
                placeholder="Enter email or username"
                placeholderTextColor="#B09A86"
                value={emailOrUsername}
                onChangeText={v => { setEmailOrUsername(v); clearErr('id'); }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => Keyboard.dismiss()}
                onFocus={() => setFocused('id')}
                onBlur={() => setFocused(null)}
              />
            </View>
            {hasErr('id') && <Text style={styles.errText}>{fieldErrors.id}</Text>}

            {/* Password */}
            <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
            <View style={[styles.inputRow, focused === 'pw' && styles.inputFocused, hasErr('pw') && styles.inputErr]}>
              <Feather name="lock" size={18} color={focused === 'pw' ? '#E07B3C' : '#8A6A4E'} style={styles.icon} />
              <TextInput
                style={[styles.input, webInputReset]}
                placeholder="Enter password"
                placeholderTextColor="#B09A86"
                value={password}
                onChangeText={v => { setPassword(v); clearErr('pw'); }}
                secureTextEntry={secureText}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
                onFocus={() => setFocused('pw')}
                onBlur={() => setFocused(null)}
              />
              <Pressable
                onPress={() => setSecureText(s => !s)}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={{ padding: 8 }}
              >
                <Feather name={secureText ? 'eye-off' : 'eye'} size={18} color="#8A6A4E" />
              </Pressable>
            </View>
            {hasErr('pw') && <Text style={styles.errText}>{fieldErrors.pw}</Text>}
            {!!formError && <Text style={styles.formErrText}>{formError}</Text>}

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotLink}
              activeOpacity={0.8}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Button */}
            <TouchableOpacity
              style={[styles.btn, submitting && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Log In</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.linkRow}>
              <Text style={styles.linkText}>
                New here? <Text style={styles.linkAccent}>Create an account</Text>
              </Text>
            </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF6F0' },
  safeTop: { flex: 0, backgroundColor: '#FDF6F0', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: height * 0.14, paddingBottom: 40 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  logoBold: { fontSize: 32, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', color: '#3D2B1F', letterSpacing: -0.5 },
  logoLight: { fontSize: 32, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal', color: '#E07B3C', letterSpacing: -0.5 },
  title: { fontSize: 26, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', color: '#3D2B1F', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8A6A4E', lineHeight: 22, marginBottom: 36 },
  label: { color: '#3D2B1F', fontSize: 14, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    paddingHorizontal: 14, height: 54,
    marginBottom: 4,
  },
  inputFocused: { borderColor: '#E07B3C' },
  inputErr: { borderColor: '#D9694F' },
  errText: { color: '#D9694F', fontSize: 12, marginBottom: 4, marginLeft: 4 },
  formErrText: { color: '#ff6b6b', fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', marginTop: 8, lineHeight: 18 },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#3D2B1F', fontSize: 15 },
  forgotLink: { alignSelf: 'flex-end', paddingVertical: 8 },
  forgotText: { color: '#E07B3C', fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  btn: {
    backgroundColor: '#E07B3C', borderRadius: 14,
    height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 28,
  },
  btnDisabled: { backgroundColor: '#C98B65' },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  linkRow: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#8A6A4E', fontSize: 14 },
  linkAccent: { color: '#E07B3C', fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
});
