import DesignNav from '../components/DesignNav';
import appConfig from '../../app.json';
import { useTheme, useThemedStyles } from '../theme/designTheme';
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
import { deleteAccount, getMe, updateMe } from '../api/users';
import { useCaregiverRequestCount } from '../hooks/useCaregiverRequestCount';
import { parseApiError } from '../utils/errors';
import { log } from '../utils/logger';
import ConfirmationModal from '../components/ConfirmationModal';
import AppearancePicker from '../components/AppearancePicker';

export default function ProfileScreen({ navigation }) {
  const { colors, mode } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { user, signOut, signIn } = useAuth();
  const {
    predictionResult, predictionCount, resetOnboarding, clearSavedPrediction,
  } = useOnboarding();

  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [showAppearance, setShowAppearance] = useState(false);
  const [showMEQ,   setShowMEQ]   = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
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
    setConfirmation(null);
    log.info('ProfileScreen: user logging out');
    await signOut();
  }

  function handleLogout() {
    setConfirmation('logout');
  }

  async function performDeleteAccount() {
    try {
      setDeletingAccount(true);
      await deleteAccount();
      log.info('ProfileScreen: account deleted');
      resetOnboarding();
      await clearSavedPrediction();
      await signOut({ skipServerLogout: true, accountDeleted: true });
    } catch (err) {
      log.error('ProfileScreen.performDeleteAccount', err);
      Alert.alert('Could not delete account', parseApiError(err));
    } finally {
      setDeletingAccount(false);
    }
  }

  function handleDeleteAccount() {
    setConfirmation('delete');
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
        <ActivityIndicator color={colors.accent} size="large" />
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
                  <Feather name="edit-2" size={16} color={colors.accent} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              : <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.editBtn, { backgroundColor: colors.accent + '33' }]}>
                  {saving
                    ? <ActivityIndicator size="small" color={colors.accent} />
                    : <><Feather name="check" size={16} color={colors.accent} /><Text style={styles.editBtnText}>Save</Text></>
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
                <TextInput style={[styles.nameInput, { marginRight: 8 }]} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={colors.muted} autoCapitalize="words" />
                <TextInput style={styles.nameInput} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={colors.muted} autoCapitalize="words" />
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
              <Text style={styles.statKey}>Research Score</Text>
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
                <Feather name="moon" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chronoTitle}>Know Your Sleep Type</Text>
                <Text style={styles.chronoSub}>Your chronotype is your body's natural sleep-wake preference. It is one of the factors used to calculate your research score.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.meqBtn} onPress={() => setShowMEQ(true)} activeOpacity={0.85}>
              <Feather name="external-link" size={14} color={colors.accent} />
              <Text style={styles.meqBtnText}>Take the Chronotype Quiz (MEQ)</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.updateBtn} onPress={handleUpdateFactors} activeOpacity={0.85}>
              <Feather name="refresh-cw" size={16} color={colors.onBrand} style={{ marginRight: 8 }} />
              <Text style={styles.updateBtnText}>Update My Factors & Get New Research Score</Text>
            </TouchableOpacity>
            <Text style={styles.updateHint}>
              If your sleep type or lifestyle has changed, update your factors to get an updated research score.
            </Text>
          </View>

          {/* Account */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            <MenuItem icon={<Feather name="lock" size={18} color={colors.accent} />} label="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
            <View style={styles.divider} />
            <MenuItem icon={<Feather name="shield" size={18} color={colors.accent} />} label="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
            <View style={styles.divider} />
            <MenuItem icon={<Feather name="file-text" size={18} color={colors.accent} />} label="Terms of Service" onPress={() => navigation.navigate('Terms')} />
            <View style={styles.divider} />
            <MenuItem
              icon={<Feather name="trash-2" size={18} color="#D9694F" />}
              label={deletingAccount ? 'Deleting Account...' : 'Delete Account'}
              onPress={deletingAccount ? null : handleDeleteAccount}
              danger
            />
          </View>

          {/* App */}
          <Text style={styles.sectionLabel}>APP</Text>
          <View style={styles.card}>
            <MenuItem icon={<Feather name={mode === 'dark' ? 'moon' : 'sun'} size={18} color={colors.accent} />} label="Appearance" badge={mode === 'dark' ? 'Dark' : 'Light'} onPress={() => setShowAppearance(true)} />
            <View style={styles.divider} />
            <MenuItem icon={<MaterialCommunityIcons name="brain" size={18} color={colors.accent} />} label="Project Info" onPress={() => navigation.navigate('ProjectInfo')} />
            <View style={styles.divider} />
            <MenuItem icon={<Feather name="file-text" size={18} color={colors.accent} />} label="Doctor Report" onPress={() => navigation.navigate('DoctorReport')} />
            <View style={styles.divider} />
            <MenuItem icon={<Feather name="help-circle" size={18} color={colors.accent} />} label="Help & Support" onPress={() => setShowSupport(true)} />
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Feather name="log-out" size={17} color="#D9694F" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>ADChronotype v{appConfig.expo.version}</Text>
          <View style={{ height: 16 }} />
        </ScrollView>

        <DesignNav navigation={navigation} active="Profile" badgeCount={caregiverRequestCount} />
      </View>

      <AppearancePicker visible={showAppearance} onClose={() => setShowAppearance(false)} />

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

      {/* Help & Support modal */}
      <Modal
        visible={showSupport}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSupport(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity
              style={styles.popupClose}
              onPress={() => setShowSupport(false)}
              accessibilityLabel="Close Help and Support"
            >
              <Text style={styles.popupCloseText}>×</Text>
            </TouchableOpacity>
            <View style={styles.supportIcon}>
              <Feather name="help-circle" size={24} color={colors.accent} />
            </View>
            <Text style={styles.popupTitle}>Help & Support</Text>
            <Text style={styles.popupBody}>For any questions, email:</Text>
            <Text style={styles.supportEmail} selectable>
              adchronotype.study@gmail.com
            </Text>
            <TouchableOpacity style={styles.supportCloseBtn} onPress={() => setShowSupport(false)} activeOpacity={0.8}>
              <Text style={styles.popupBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={confirmation === 'logout'}
        title="Log out?"
        message="You will need to enter your credentials again to access your account."
        confirmLabel="Log Out"
        onCancel={() => setConfirmation(null)}
        onConfirm={performLogout}
      />

      <ConfirmationModal
        visible={confirmation === 'delete'}
        title="Delete account?"
        message="This permanently deletes your account, predictions, sleep logs, cognitive test results, and caregiver connections. This cannot be undone."
        confirmLabel="Delete Account"
        danger
        busy={deletingAccount}
        onCancel={() => setConfirmation(null)}
        onConfirm={performDeleteAccount}
      />
    </>
  );
}

function MenuItem({ icon, label, onPress, badge, disabled = false, danger = false }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity style={[styles.menuItem, disabled && styles.menuItemDisabled]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress || disabled}>
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger, disabled && styles.menuLabelDisabled]}>{label}</Text>
      {badge
        ? <View style={styles.badgeWrap}><Text style={styles.badgeText}>{badge}</Text></View>
        : onPress ? <Feather name="chevron-right" size={16} color={colors.muted} /> : null
      }
    </TouchableOpacity>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background },
  safeTop:     { flex: 0, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  headerRow:   {flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingTop:16,paddingBottom:14},
  headerTitle: {color:colors.text,fontSize:24,fontFamily:'Lexend_800ExtraBold'},
  editBtn:     {flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:14,minHeight:40,backgroundColor:colors.tint,borderRadius:20},
  editBtnText: { color: colors.accent, fontSize: 13, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },
  avatarSection: {alignItems:'center',gap:4,marginBottom:14},
  avatarRing:  {width:84,height:84,borderRadius:42,borderWidth:3,borderColor:colors.accent,padding:3,marginBottom:4},
  avatar:      {flex:1,borderRadius:38,backgroundColor:colors.tint,alignItems:'center',justifyContent:'center'},
  initials:    { color: colors.accent, fontSize: 26, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  displayName: {color:colors.text,fontSize:18,fontFamily:'Lexend_700Bold'},
  nameEditRow: { flexDirection: 'row', marginBottom: 4, paddingHorizontal: 24 },
  nameInput:   { flex: 1, color: colors.text, fontSize: 15, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal', backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1.5, borderColor: colors.accent, paddingHorizontal: 12, paddingVertical: 8 },
  username:    {color:colors.secondary,fontSize:12,fontFamily:'Lexend_400Regular'},
  email:       {color:colors.muted,fontSize:11.5,fontFamily:'Lexend_400Regular'},
  statsRow:    {flexDirection:'row',gap:8,marginHorizontal:20,marginBottom:14},
  statCard:    {flex:1,minHeight:64,backgroundColor:colors.surface,borderRadius:14,paddingVertical:12,paddingHorizontal:6,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border},
  statVal:     {color:colors.accent,fontSize:18,fontFamily:'Lexend_800ExtraBold',marginBottom:3},
  statLevelVal:{color:colors.warningStrong,fontSize:12,fontFamily:'Lexend_800ExtraBold',textAlign:'center'},
  statKey:     {color:colors.secondary,fontSize:9.5,fontFamily:'Lexend_700Bold',textTransform:'uppercase',letterSpacing:0.3},
  sectionLabel:{color:colors.muted,fontSize:11,fontFamily:'Lexend_800ExtraBold',letterSpacing:1.1,marginHorizontal:20,marginBottom:10,marginTop:0},
  card:        {marginHorizontal:20,backgroundColor:colors.surface,borderRadius:16,borderWidth:1,borderColor:colors.border,marginBottom:14,overflow:'hidden'},
  divider:     { height: 1, backgroundColor: colors.border, marginLeft: 48 },
  menuItem:    {flexDirection:'row',alignItems:'center',minHeight:52,paddingHorizontal:14,paddingVertical:10},
  menuItemDisabled: { opacity: 0.8 },
  menuIcon:    { width: 34, alignItems: 'center' },
  menuLabel:   {flex:1,color:colors.text,fontSize:14,fontFamily:'Lexend_600SemiBold'},
  menuLabelDanger: { color: '#D9694F', fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  menuLabelDisabled: { color: colors.secondary },
  badgeWrap:   { backgroundColor: colors.border, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:   { color: colors.muted, fontSize: 10, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },

  // Chronotype section
  chronoRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, paddingBottom: 10 },
  chronoIconWrap:{width:38,height:38,borderRadius:19,backgroundColor:colors.tint,alignItems:'center',justifyContent:'center'},
  chronoTitle:   { color: colors.text, fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', marginBottom: 4 },
  chronoSub:     {color:colors.secondary,fontSize:12,fontFamily:'Lexend_400Regular',lineHeight:17.4},
  meqBtn:        {flexDirection:'row',alignItems:'center',gap:7,marginHorizontal:14,marginBottom:12,backgroundColor:colors.tint,borderRadius:10,minHeight:44,paddingHorizontal:12},
  meqBtnText:    {color:colors.accent,fontSize:13,fontFamily:'Lexend_600SemiBold',flex:1},
  updateBtn:     {flexDirection:'row',alignItems:'center',margin:14,marginTop:12,backgroundColor:colors.brand,borderRadius:12,minHeight:48,paddingVertical:10,paddingHorizontal:14,justifyContent:'center'},
  updateBtnText: {color:colors.onBrand,fontSize:13.5,fontFamily:'Lexend_700Bold',textAlign:'center',flex:1},
  updateHint:    {color:colors.muted,fontSize:11,fontFamily:'Lexend_400Regular',lineHeight:16.5,marginHorizontal:14,marginBottom:12,textAlign:'center'},

  logoutBtn:   {flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginHorizontal:20,borderRadius:14,borderWidth:1,borderColor:colors.border,minHeight:50,backgroundColor:colors.surface,marginBottom:14},
  logoutText:  { color: '#D9694F', fontSize: 14, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },
  version:     {fontFamily:'Lexend_400Regular', color: colors.muted, fontSize: 11, textAlign: 'center', marginBottom: 8 },

  // nav

  // MEQ modal
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popup:          { backgroundColor: colors.surface, borderRadius: 18, padding: 22, width: '100%', borderWidth: 1, borderColor: colors.border, position: 'relative' },
  popupClose:     { position: 'absolute', top: 14, right: 18, zIndex: 10 },
  popupCloseText: {fontFamily:'Lexend_400Regular', color: colors.secondary, fontSize: 22 },
  popupTitle:     { color: colors.text, fontSize: 18, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginBottom: 12, paddingRight: 20 },
  popupBody:      {fontFamily:'Lexend_400Regular', color: colors.secondary, fontSize: 13, lineHeight: 20 },
  popupBtn:       { backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 20 },
  popupBtnText:   { color: colors.onBrand, fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  popupBtnSecondary:     { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border },
  popupBtnSecondaryText: { color: colors.secondary, fontSize: 14, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },
  supportIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent + '44', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  supportEmail: { color: colors.accent, fontSize: 14, lineHeight: 20, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginTop: 6 },
  supportCloseBtn: { backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', marginTop: 20 },
});
