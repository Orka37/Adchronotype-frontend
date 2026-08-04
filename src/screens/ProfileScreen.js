import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  TextInput, Platform, Modal, Linking,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import { getMe, updateMe } from '../api/users';
import { useCaregiverRequestCount } from '../hooks/useCaregiverRequestCount';
import { parseApiError } from '../utils/errors';
import { log } from '../utils/logger';

export default function ProfileScreen({ navigation }) {
  const { user, signOut, signIn } = useAuth();
  const { predictionResult, predictionCount, resetOnboarding } = useOnboarding();

  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [showMEQ,   setShowMEQ]   = useState(false);
  const caregiverRequestCount = useCaregiverRequestCount();

  useEffect(() => { fetchProfile(); }, []);
  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  async function fetchProfile() {
    try {
      setLoading(true);
      const data = await getMe();
      setProfile(data);
      setFirstName(data.firstName);
      setLastName(data.lastName);
      log.debug('ProfileScreen: profile loaded', data.username);
    } catch (err) {
      log.error('ProfileScreen.fetchProfile', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing fields', 'First and last name are required.');
      return;
    }
    try {
      setSaving(true);
      const updated = await updateMe({ firstName: firstName.trim(), lastName: lastName.trim() });
      setProfile(updated);
      await signIn(updated, null);
      setEditing(false);
      log.info('ProfileScreen: name updated');
    } catch (err) {
      log.error('ProfileScreen.handleSave', err);
      Alert.alert('Failed to save', parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function performLogout() {
    log.info('ProfileScreen: user logging out');
    await signOut();
  }

  function handleLogout() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Are you sure you want to log out?')) {
        performLogout();
      }
      return;
    }

    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: performLogout },
    ]);
  }

  function openMEQ() {
    Linking.openURL('https://qxmd.com/calculate/calculator_829/morningness-eveningness-questionnaire-meq#')
      .catch(() => log.warn('ProfileScreen: could not open MEQ link'));
  }

  function handleUpdateFactors() {
    log.info('ProfileScreen: user updating factors');
    resetOnboarding();
    navigation.navigate('SleepType', { skipWelcome: true });
  }

  const score     = predictionResult?.prediction ?? null;
  const similarityLabel = score == null
    ? null
    : score >= 60 ? 'Higher Similarity' : score >= 30 ? 'Moderate Similarity' : 'Lower Similarity';
  const initials  = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <View style={styles.root}>
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Profile</Text>
            {!editing
              ? <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
                  <Feather name="edit-2" size={16} color="#7c3aed" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              : <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.editBtn, { backgroundColor: '#7c3aed33' }]}>
                  {saving
                    ? <ActivityIndicator size="small" color="#7c3aed" />
                    : <><Feather name="check" size={16} color="#7c3aed" /><Text style={styles.editBtnText}>Save</Text></>
                  }
                </TouchableOpacity>
            }
          </View>

          {/* Avatar + name */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{initials}</Text>
              </View>
            </View>
            {editing ? (
              <View style={styles.nameEditRow}>
                <TextInput style={[styles.nameInput, { marginRight: 8 }]} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#4a5270" autoCapitalize="words" />
                <TextInput style={styles.nameInput} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#4a5270" autoCapitalize="words" />
              </View>
            ) : (
              <Text style={styles.displayName}>{profile?.firstName} {profile?.lastName}</Text>
            )}
            <Text style={styles.username}>@{profile?.username}</Text>
            <Text style={styles.email}>{profile?.email}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{score != null ? `${score}%` : '—'}</Text>
              <Text style={styles.statKey}>Brain Score</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, styles.statLevelVal]}>
                {similarityLabel ?? '—'}
              </Text>
              <Text style={styles.statKey}>Score Level</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{predictionCount}</Text>
              <Text style={styles.statKey}>Predictions</Text>
            </View>
          </View>

          {/* Chronotype / Factor Details section */}
          <Text style={styles.sectionLabel}>YOUR CHRONOTYPE</Text>
          <View style={styles.card}>
            <View style={styles.chronoRow}>
              <View style={styles.chronoIconWrap}>
                <Text style={{ fontSize: 20 }}>🌙</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chronoTitle}>Know Your Sleep Type</Text>
                <Text style={styles.chronoSub}>Your chronotype is your body's natural sleep-wake preference. It affects your brain health score.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.meqBtn} onPress={() => setShowMEQ(true)} activeOpacity={0.85}>
              <Feather name="external-link" size={14} color="#7c3aed" />
              <Text style={styles.meqBtnText}>Take the Chronotype Quiz (MEQ)</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.updateBtn} onPress={handleUpdateFactors} activeOpacity={0.85}>
              <Feather name="refresh-cw" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.updateBtnText}>Update My Factors & Get New Prediction</Text>
            </TouchableOpacity>
            <Text style={styles.updateHint}>
              If your sleep type or lifestyle has changed, update your factors to get an updated brain health score.
            </Text>
          </View>

          {/* Account */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            <MenuItem icon={<Feather name="lock" size={18} color="#7c3aed" />} label="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
            <View style={styles.divider} />
            <MenuItem icon={<Feather name="bell" size={18} color="#7c3aed" />} label="Notifications" badge="Soon" />
            <View style={styles.divider} />
            <MenuItem icon={<Feather name="shield" size={18} color="#7c3aed" />} label="Privacy & Data" badge="Soon" />
          </View>

          {/* App */}
          <Text style={styles.sectionLabel}>APP</Text>
          <View style={styles.card}>
            <MenuItem icon={<MaterialCommunityIcons name="brain" size={18} color="#7c3aed" />} label="Project Info" onPress={() => navigation.navigate('ProjectInfo')} />
            <View style={styles.divider} />
            <MenuItem icon={<Feather name="file-text" size={18} color="#7c3aed" />} label="Doctor Report" onPress={() => navigation.navigate('DoctorReport')} />
            <View style={styles.divider} />
            <MenuItem icon={<Feather name="help-circle" size={18} color="#7c3aed" />} label="Help & Support" badge="Soon" />
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Feather name="log-out" size={17} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>ADChronotype v1.0.0</Text>
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom nav */}
        <View style={styles.navWrap}>
          <View style={styles.nav}>
            {[
              { label: 'Home',    icon: 'home',      active: false, onPress: () => navigation.navigate('Report') },
              { label: 'Sleep',   icon: 'moon',      active: false, onPress: () => navigation.navigate('SleepLog') },
              { label: 'Tips',    icon: 'book-open', active: false, onPress: () => navigation.navigate('Tips') },
              { label: 'Caregiver', icon: 'users',   active: false, onPress: () => navigation.navigate('Caregiver'), badgeCount: caregiverRequestCount },
              { label: 'Profile', icon: 'user',      active: true,  onPress: null },
            ].map(t => (
              <TouchableOpacity key={t.label} style={styles.navItem} onPress={t.onPress} disabled={t.active} activeOpacity={0.7}>
                {t.badgeCount > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{t.badgeCount > 9 ? '9+' : t.badgeCount}</Text>
                  </View>
                )}
                <Feather name={t.icon} size={22} color={t.active ? '#8a52f3' : '#6c7094'} />
                <Text style={[styles.navLabel, t.active && { color: '#8a52f3' }]}>{t.label}</Text>
                {t.active && <View style={styles.activeDot} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* MEQ modal */}
      <Modal visible={showMEQ} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity style={styles.popupClose} onPress={() => setShowMEQ(false)}>
              <Text style={styles.popupCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.popupTitle}>Chronotype Quiz</Text>
            <Text style={styles.popupBody}>
              The Morningness-Eveningness Questionnaire (MEQ) is a validated 19-question quiz that returns your chronotype category.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity style={styles.popupBtnSecondary} onPress={() => setShowMEQ(false)}>
                <Text style={styles.popupBtnSecondaryText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popupBtn} onPress={() => { setShowMEQ(false); openMEQ(); }}>
                <Text style={styles.popupBtnText}>Take Quiz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuItem({ icon, label, onPress, badge, disabled = false }) {
  return (
    <TouchableOpacity style={[styles.menuItem, disabled && styles.menuItemDisabled]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress || disabled}>
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={[styles.menuLabel, disabled && styles.menuLabelDisabled]}>{label}</Text>
      {badge
        ? <View style={styles.badgeWrap}><Text style={styles.badgeText}>{badge}</Text></View>
        : onPress ? <Feather name="chevron-right" size={16} color="#4a5270" /> : null
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#0B0F1A' },
  safeTop:     { flex: 0, backgroundColor: '#0B0F1A', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#7c3aed22', borderRadius: 20, borderWidth: 1, borderColor: '#7c3aed44' },
  editBtnText: { color: '#7c3aed', fontSize: 13, fontWeight: '600' },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarRing:  { width: 82, height: 82, borderRadius: 41, borderWidth: 3, borderColor: '#7c3aed', padding: 3, marginBottom: 12 },
  avatar:      { flex: 1, borderRadius: 38, backgroundColor: '#161b3d', alignItems: 'center', justifyContent: 'center' },
  initials:    { color: '#7c3aed', fontSize: 26, fontWeight: '800' },
  displayName: { color: '#fff', fontSize: 19, fontWeight: '700', marginBottom: 3 },
  nameEditRow: { flexDirection: 'row', marginBottom: 4, paddingHorizontal: 24 },
  nameInput:   { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600', backgroundColor: '#161b3d', borderRadius: 10, borderWidth: 1.5, borderColor: '#7c3aed', paddingHorizontal: 12, paddingVertical: 8 },
  username:    { color: '#6c7094', fontSize: 13, marginBottom: 2 },
  email:       { color: '#4a5270', fontSize: 12 },
  statsRow:    { flexDirection: 'row', gap: 8, marginHorizontal: 18, marginBottom: 20 },
  statCard:    { flex: 1, minHeight: 76, backgroundColor: '#161b3d', borderRadius: 13, paddingVertical: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1f254f' },
  statVal:     { color: '#7c3aed', fontSize: 17, fontWeight: '800', marginBottom: 2 },
  statLevelVal:{ color: '#ffb830', fontSize: 13, lineHeight: 17, minHeight: 34, textAlign: 'center', textAlignVertical: 'center' },
  statKey:     { color: '#6c7094', fontSize: 9, fontWeight: '600', letterSpacing: 0.3 },
  sectionLabel:{ color: '#4a5270', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginHorizontal: 20, marginBottom: 7, marginTop: 4 },
  card:        { marginHorizontal: 18, backgroundColor: '#161b3d', borderRadius: 16, borderWidth: 1, borderColor: '#1f254f', marginBottom: 16, overflow: 'hidden' },
  divider:     { height: 1, backgroundColor: '#1f254f', marginLeft: 48 },
  menuItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  menuItemDisabled: { opacity: 0.8 },
  menuIcon:    { width: 34, alignItems: 'center' },
  menuLabel:   { flex: 1, color: '#e0e0e0', fontSize: 14, fontWeight: '500' },
  menuLabelDisabled: { color: '#6c7094' },
  badgeWrap:   { backgroundColor: '#1f254f', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:   { color: '#4a5270', fontSize: 10, fontWeight: '600' },

  // Chronotype section
  chronoRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, paddingBottom: 10 },
  chronoIconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#7c3aed22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chronoTitle:   { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  chronoSub:     { color: '#6c7094', fontSize: 11, lineHeight: 16 },
  meqBtn:        { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 14, marginBottom: 12, backgroundColor: '#7c3aed15', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#7c3aed33' },
  meqBtnText:    { color: '#7c3aed', fontSize: 12, fontWeight: '600', flex: 1 },
  updateBtn:     { flexDirection: 'row', alignItems: 'center', margin: 14, marginTop: 12, backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, justifyContent: 'center' },
  updateBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center', flex: 1 },
  updateHint:    { color: '#4a5270', fontSize: 10, lineHeight: 15, marginHorizontal: 14, marginBottom: 12, textAlign: 'center' },

  logoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 18, borderRadius: 14, borderWidth: 1.5, borderColor: '#ef444444', paddingVertical: 14, backgroundColor: '#ef444411', marginBottom: 14 },
  logoutText:  { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  version:     { color: '#2a3060', fontSize: 11, textAlign: 'center', marginBottom: 8 },

  // nav
  navWrap:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0B0F1A', borderTopWidth: 1, borderTopColor: '#1f254f' },
  nav:        { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  navItem:    { alignItems: 'center', width: 64 },
  navBadge: { position: 'absolute', top: -5, right: 13, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#ff5c5c', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 2 },
  navBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  navLabel:   { color: '#6c7094', fontSize: 10, marginTop: 4, fontWeight: '600' },
  navLabelDisabled: { color: '#3a4060' },
  activeDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: '#8a52f3', position: 'absolute', bottom: -8 },

  // MEQ modal
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popup:          { backgroundColor: '#0e1228', borderRadius: 18, padding: 22, width: '100%', borderWidth: 1, borderColor: '#1f254f', position: 'relative' },
  popupClose:     { position: 'absolute', top: 14, right: 18, zIndex: 10 },
  popupCloseText: { color: '#6c7094', fontSize: 22 },
  popupTitle:     { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12, paddingRight: 20 },
  popupBody:      { color: '#a0a3b8', fontSize: 13, lineHeight: 20 },
  popupBtn:       { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 20 },
  popupBtnText:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  popupBtnSecondary:     { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, borderWidth: 1, borderColor: '#1f254f' },
  popupBtnSecondaryText: { color: '#6c7094', fontSize: 14, fontWeight: '600' },
});
