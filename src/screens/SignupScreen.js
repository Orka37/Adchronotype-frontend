import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Platform,
  KeyboardAvoidingView, ScrollView,
  Keyboard, Dimensions, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { signupUser } from '../api/auth';
import { parseApiError } from '../utils/errors';
import { validateEmail, validateUsername, validatePassword, validateRequired } from '../utils/validators';
import { log } from '../utils/logger';
import { useAuth } from '../context/AuthContext';

const { height } = Dimensions.get('window');
const webInputReset = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

function SignupField({ id, label, value, onChange, icon, opts = {}, focused, setFocused, error, clearErr }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused === id && styles.inputFocused, error && styles.inputErr]}>
        <Feather name={icon} size={18} color={focused === id ? '#7c3aed' : '#6c7094'} style={styles.icon} />
        <TextInput
          style={[styles.input, webInputReset]}
          placeholder={opts.ph || `Enter ${label.toLowerCase()}`}
          placeholderTextColor="#4a5270"
          value={value}
          onChangeText={v => { onChange(v); clearErr(id); }}
          autoCapitalize={opts.cap || 'words'}
          keyboardType={opts.kb || 'default'}
          autoCorrect={false}
          autoComplete={opts.autoComplete || 'off'}
          textContentType={opts.textContentType || 'none'}
          returnKeyType={opts.returnKeyType || 'next'}
          blurOnSubmit={false}
          onFocus={() => setFocused(id)}
          onBlur={() => setFocused(null)}
        />
      </View>
      {error && <Text style={styles.errText}>{error}</Text>}
    </View>
  );
}

export default function SignupScreen({ navigation }) {
  const { signIn } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [username,  setUsername]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [focused,    setFocused]    = useState(null);
  const [errs,       setErrs]       = useState({});
  const [submitError, setSubmitError] = useState('');

  function clearErr(k) {
    if (errs[k]) setErrs(p => ({ ...p, [k]: null }));
    if (submitError) setSubmitError('');
  }

  function validate() {
    const e = {};
    const fn = validateRequired(firstName, 'First name'); if (fn) e.fn = fn;
    const ln = validateRequired(lastName,  'Last name');  if (ln) e.ln = ln;
    const un = validateUsername(username);                if (un) e.un = un;
    const em = validateEmail(email);                      if (em) e.em = em;
    const pw = validatePassword(password);                if (pw) e.pw = pw;
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup() {
    if (!validate()) return;
    try {
      setSubmitting(true);
      setSubmitError('');
      Keyboard.dismiss();
      const result = await signupUser({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        username:  username.trim(),
        email:     email.trim().toLowerCase(),
        password,
      });
      log.info('signup success', result.user?.username);
      await signIn(result.user, result.tokens);
    } catch (err) {
      log.error('SignupScreen.handleSignup', err);
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409 && detail === 'username already taken') {
        setErrs(current => ({ ...current, un: 'Username is already taken.' }));
      } else if (err?.response?.status === 409 && detail === 'email already registered') {
        setErrs(current => ({ ...current, em: 'Email address is already registered.' }));
      } else {
        setSubmitError(parseApiError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const hasErr = k => !!errs[k];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
            <View style={styles.logoWrap}>
              <Text style={styles.logoBold}>AD</Text>
              <Text style={styles.logoLight}>Chronotype</Text>
            </View>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start your brain health prediction journey.</Text>

            <SignupField id="fn" label="First Name" value={firstName} onChange={setFirstName} icon="user" opts={{ autoComplete: 'given-name', textContentType: 'givenName' }} focused={focused} setFocused={setFocused} error={errs.fn} clearErr={clearErr} />
            <SignupField id="ln" label="Last Name" value={lastName} onChange={setLastName} icon="user" opts={{ marginTop: 18, autoComplete: 'family-name', textContentType: 'familyName' }} focused={focused} setFocused={setFocused} error={errs.ln} clearErr={clearErr} />
            <SignupField id="un" label="Username" value={username} onChange={setUsername} icon="at-sign" opts={{ cap: 'none', ph: 'e.g. brain_health_99', autoComplete: 'username', textContentType: 'username' }} focused={focused} setFocused={setFocused} error={errs.un} clearErr={clearErr} />
            <SignupField id="em" label="Email Address" value={email} onChange={setEmail} icon="mail" opts={{ cap: 'none', kb: 'email-address', ph: 'you@example.com', autoComplete: 'email', textContentType: 'emailAddress' }} focused={focused} setFocused={setFocused} error={errs.em} clearErr={clearErr} />

            {/* Password — manual because of eye toggle */}
            <Text style={[styles.label, { marginTop: 4 }]}>Password</Text>
            <View style={[styles.inputRow, focused === 'pw' && styles.inputFocused, hasErr('pw') && styles.inputErr]}>
              <Feather name="lock" size={18} color={focused === 'pw' ? '#7c3aed' : '#6c7094'} style={styles.icon} />
              <TextInput
                style={[styles.input, webInputReset]}
                placeholder="Min 8 characters"
                placeholderTextColor="#4a5270"
                value={password}
                onChangeText={v => { setPassword(v); clearErr('pw'); }}
                secureTextEntry={secureText}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                blurOnSubmit={false}
                onFocus={() => setFocused('pw')}
                onBlur={() => setFocused(null)}
              />
              <Pressable
                onPress={() => setSecureText(s => !s)}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={{ padding: 8 }}
              >
                <Feather name={secureText ? 'eye-off' : 'eye'} size={18} color="#6c7094" />
              </Pressable>
            </View>
            {hasErr('pw') && <Text style={styles.errText}>{errs.pw}</Text>}

            {!!submitError && (
              <View style={styles.submitErrorBox}>
                <Feather name="alert-circle" size={18} color="#fbbf24" style={styles.submitErrorIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.submitErrorTitle}>Could not create account</Text>
                  <Text style={styles.submitErrorText}>{submitError}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, submitting && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Create Account</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkAccent}>Log in</Text>
              </Text>
            </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F1A' },
  safeTop: { flex: 0, backgroundColor: '#0B0F1A', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: height * 0.08, paddingBottom: 40 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  logoBold: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  logoLight: { fontSize: 30, fontWeight: '600', color: '#7c3aed', letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6c7094', lineHeight: 21, marginBottom: 28 },
  label: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161b3d', borderRadius: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    paddingHorizontal: 14, height: 52, marginBottom: 2,
  },
  inputFocused: { borderColor: '#7c3aed' },
  inputErr: { borderColor: '#ef4444' },
  errText: { color: '#ef4444', fontSize: 11, marginBottom: 2, marginLeft: 2 },
  submitErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#231a31',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  submitErrorIcon: { marginRight: 10, marginTop: 1 },
  submitErrorTitle: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 3 },
  submitErrorText: { color: '#fca5a5', fontSize: 12, lineHeight: 17 },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  btn: {
    backgroundColor: '#7c3aed', borderRadius: 14,
    height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 28,
  },
  btnDisabled: { backgroundColor: '#3b2d6e' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkRow: { marginTop: 22, alignItems: 'center' },
  linkText: { color: '#6c7094', fontSize: 14 },
  linkAccent: { color: '#7c3aed', fontWeight: '700' },
});
