import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, SafeAreaView, Platform,
  KeyboardAvoidingView, ScrollView, Pressable,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { changePassword } from '../api/users';
import { parseApiError } from '../utils/errors';
import { log } from '../utils/logger';

const webInputReset = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

function PasswordField({ id, label, value, onChange, show, onToggle, placeholder, focused, setFocused, error, clear }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.lbl}>{label}</Text>
      <View style={[
        styles.inputRow,
        focused === id && styles.focused,
        error && styles.errBorder,
      ]}>
        <Feather name="lock" size={17} color={focused === id ? '#7c3aed' : '#6c7094'} style={styles.icon} />
        <TextInput
          style={[styles.input, webInputReset]}
          value={value}
          onChangeText={v => { onChange(v); clear(id); }}
          secureTextEntry={!show}
          placeholder={placeholder}
          placeholderTextColor="#4a5270"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={id === 'cur' ? 'current-password' : 'new-password'}
          textContentType={id === 'cur' ? 'password' : 'newPassword'}
          returnKeyType={id === 'con' ? 'done' : 'next'}
          blurOnSubmit={false}
          onFocus={() => setFocused(id)}
          onBlur={() => setFocused(null)}
        />
        <Pressable
          onPress={onToggle}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={{ padding: 8 }}
        >
          <Feather name={show ? 'eye' : 'eye-off'} size={17} color="#6c7094" />
        </Pressable>
      </View>
      {error && <Text style={styles.errText}>{error}</Text>}
    </View>
  );
}

export default function ChangePasswordScreen({ navigation }) {
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState(null);
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showCon,  setShowCon]  = useState(false);
  const [errs,     setErrs]     = useState({});

  function validate() {
    const e = {};
    if (!current)              e.cur = 'Current password is required.';
    if (next.length < 8)       e.nxt = 'New password must be at least 8 characters.';
    if (next !== confirm)      e.con = 'Passwords do not match.';
    if (next === current)      e.nxt = 'New password must differ from the current one.';
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  function clear(k) { if (errs[k]) setErrs(p => ({ ...p, [k]: null })); }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      setLoading(true);
      Keyboard.dismiss();
      await changePassword({ current_password: current, new_password: next });
      log.info('ChangePasswordScreen: password changed successfully');
      Alert.alert(
        'Password updated',
        'Your password has been changed. Please log in again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      log.error('ChangePasswordScreen.handleSubmit', err);
      Alert.alert('Failed', parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <View style={styles.root}>
        <SafeAreaView style={styles.safeTop} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="chevron-left" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.hint}>
              Choose a strong password — at least 8 characters. You'll need to log in again after changing it.
            </Text>

            <PasswordField
              id="cur"
              label="Current Password"
              value={current}
              onChange={setCurrent}
              show={showCur}
              onToggle={() => setShowCur(s => !s)}
              placeholder="Enter current password"
              focused={focused}
              setFocused={setFocused}
              error={errs.cur}
              clear={clear}
            />

            <View style={{ height: 8 }} />

            <PasswordField
              id="nxt"
              label="New Password"
              value={next}
              onChange={setNext}
              show={showNew}
              onToggle={() => setShowNew(s => !s)}
              placeholder="Min 8 characters"
              focused={focused}
              setFocused={setFocused}
              error={errs.nxt}
              clear={clear}
            />

            <PasswordField
              id="con"
              label="Confirm New Password"
              value={confirm}
              onChange={setConfirm}
              show={showCon}
              onToggle={() => setShowCon(s => !s)}
              placeholder="Re-enter new password"
              focused={focused}
              setFocused={setFocused}
              error={errs.con}
              clear={clear}
            />

            {/* Strength hint */}
            {next.length > 0 && (
              <View style={styles.strengthRow}>
                {[4,8,12].map(n => (
                  <View
                    key={n}
                    style={[
                      styles.strengthBar,
                      next.length >= n && styles.strengthFill,
                      next.length >= 12 && styles.strengthStrong,
                    ]}
                  />
                ))}
                <Text style={styles.strengthLabel}>
                  {next.length < 8 ? 'Too short' : next.length < 12 ? 'Good' : 'Strong'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnLoading]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Update Password</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#0B0F1A' },
  safeTop:     { flex: 0, backgroundColor: '#0B0F1A', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1f254f' },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  scroll:      { padding: 24, paddingTop: 28 },
  hint:        { color: '#6c7094', fontSize: 13, lineHeight: 20, marginBottom: 28 },
  lbl:         { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 14 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161b3d', borderRadius: 13, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 13, height: 52, marginBottom: 2 },
  focused:     { borderColor: '#7c3aed' },
  errBorder:   { borderColor: '#ef4444' },
  errText:     { color: '#ef4444', fontSize: 11, marginTop: 2, marginLeft: 2 },
  icon:        { marginRight: 9 },
  input:       { flex: 1, color: '#fff', fontSize: 14 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 4 },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#1f254f', borderRadius: 2 },
  strengthFill:{ backgroundColor: '#ffb830' },
  strengthStrong: { backgroundColor: '#00c9b1' },
  strengthLabel:  { color: '#6c7094', fontSize: 11, fontWeight: '600', minWidth: 48 },
  btn:         { backgroundColor: '#7c3aed', borderRadius: 13, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  btnLoading:  { backgroundColor: '#3b2d6e' },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
