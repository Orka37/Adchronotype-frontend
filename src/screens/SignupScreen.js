import { useTheme, useThemedStyles } from '../theme/designTheme';
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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused === id && styles.inputFocused, error && styles.inputErr]}>
        <Feather name={icon} size={18} color={focused === id ? colors.accent : colors.secondary} style={styles.icon} />
        <TextInput
          style={[styles.input, webInputReset]}
          placeholder={opts.ph || `Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.muted}
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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

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
            <Text style={styles.subtitle}>Explore sleep patterns and cognitive health research.</Text>

<View style={{flexDirection:'row',gap:12,marginBottom:12}}><View style={{flex:1}}><SignupField id="fn" label="First Name" value={firstName} onChange={setFirstName} icon="user" opts={{ autoComplete: 'given-name', textContentType: 'givenName' }} focused={focused} setFocused={setFocused} error={errs.fn} clearErr={clearErr} /></View><View style={{flex:1}}><SignupField id="ln" label="Last Name" value={lastName} onChange={setLastName} icon="user" opts={{ marginTop: 18, autoComplete: 'family-name', textContentType: 'familyName' }} focused={focused} setFocused={setFocused} error={errs.ln} clearErr={clearErr} /></View></View>
<View style={{gap:12,marginBottom:12}}><SignupField id="em" label="Email Address" value={email} onChange={setEmail} icon="mail" opts={{ cap: 'none', kb: 'email-address', ph: 'you@example.com', autoComplete: 'email', textContentType: 'emailAddress' }} focused={focused} setFocused={setFocused} error={errs.em} clearErr={clearErr} /><SignupField id="un" label="Username" value={username} onChange={setUsername} icon="at-sign" opts={{ cap: 'none', ph: 'e.g. brain_health_99', autoComplete: 'username', textContentType: 'username' }} focused={focused} setFocused={setFocused} error={errs.un} clearErr={clearErr} /></View>

            {/* Password — manual because of eye toggle */}
            <Text style={[styles.label, { marginTop: 4 }]}>Password</Text>
            <View style={[styles.inputRow, focused === 'pw' && styles.inputFocused, hasErr('pw') && styles.inputErr]}>
              <Feather name="lock" size={18} color={focused === 'pw' ? colors.accent : colors.secondary} style={styles.icon} />
              <TextInput
                style={[styles.input, webInputReset]}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.muted}
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
                <Feather name={secureText ? 'eye-off' : 'eye'} size={18} color={colors.secondary} />
              </Pressable>
            </View>
            {hasErr('pw') ? <Text style={styles.errText}>{errs.pw}</Text> : <Text style={{fontFamily:'Lexend_400Regular',fontSize:11.5,color:colors.muted,marginTop:6}}>Use at least 8 characters.</Text>}

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
                ? <ActivityIndicator color={colors.onBrand} />
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

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeTop: { flex: 0, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  scroll: {flexGrow:1,paddingHorizontal:24,paddingTop:28,paddingBottom:36},
  logoWrap: {flexDirection:'row',justifyContent:'center',alignItems:'baseline',marginBottom:28},
  logoBold: {color:colors.text,fontSize:26,fontFamily:'Lexend_800ExtraBold'},
  logoLight: {color:colors.accent,fontSize:26,fontFamily:'Lexend_600SemiBold'},
  title: {color:colors.text,fontSize:28,fontFamily:'Lexend_800ExtraBold',lineHeight:33.6,marginBottom:6},
  subtitle: {color:colors.secondary,fontSize:15,fontFamily:'Lexend_400Regular',lineHeight:22.5,marginBottom:28},
  label: {color:colors.secondary,fontSize:13,fontFamily:'Lexend_600SemiBold',marginBottom:6},
  inputRow: {flexDirection:'row',alignItems:'center',backgroundColor:colors.surface,borderRadius:14,borderWidth:1,borderColor:colors.border,paddingHorizontal:16,minHeight:52},
  inputFocused: { borderColor: colors.accent },
  inputErr: { borderColor: '#D9694F' },
  errText: {fontFamily:'Lexend_400Regular', color: '#D9694F', fontSize: 11, marginBottom: 2, marginLeft: 2 },
  submitErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.errorSurface,
    borderColor: colors.errorStrong,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  submitErrorIcon: { marginRight: 10, marginTop: 1 },
  submitErrorTitle: { color: colors.onBrand, fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', marginBottom: 3 },
  submitErrorText: {fontFamily:'Lexend_400Regular', color: '#fca5a5', fontSize: 12, lineHeight: 17 },
  icon: {display:'none'},
  input: {flex:1,color:colors.text,fontSize:16,fontFamily:'Lexend_400Regular',minHeight:50},
  btn: {backgroundColor:colors.brand,borderRadius:16,minHeight:54,alignItems:'center',justifyContent:'center',marginTop:14},
  btnDisabled: { backgroundColor: colors.disabled },
  btnText: {color:colors.onBrand,fontSize:17,fontFamily:'Lexend_700Bold'},
  linkRow: {marginTop:'auto',paddingTop:28,alignItems:'center'},
  linkText: {fontFamily:'Lexend_400Regular', color: colors.secondary, fontSize: 14 },
  linkAccent: { color: colors.accent, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
});
