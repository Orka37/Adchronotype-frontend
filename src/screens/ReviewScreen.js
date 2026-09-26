import { useTheme, useThemedStyles } from '../context/ThemeContext';
import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, Alert, ActivityIndicator, ScrollView, Linking, Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import StepIndicator from '../components/StepIndicator';
import { useOnboarding } from '../context/OnboardingContext';
import { predictBrainHealth } from '../api/predict';
import { parseApiError } from '../utils/errors';
import { log } from '../utils/logger';
import {
  RESEARCH_DISCLAIMER,
  RESEARCH_DISCLAIMER_SHORT,
  RESEARCH_METHODOLOGY,
  RESEARCH_SOURCES,
} from '../constants/researchDisclosure';

export default function ReviewScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [submitting, setSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const {
    sleepType, bedTime, wakeTime,
    age, heightFt, heightIn, heightCm, weight, unit,
    ethnicity, gender, familyHistory,
    recordPredictionResult,
  } = useOnboarding();

  const normalizeSleepDate = (date) => {
    if (!date) return 'Not set';
    const normalized = new Date(date);
    const minutes = normalized.getMinutes();
    if (minutes <= 15) {
      normalized.setMinutes(0, 0, 0);
    } else if (minutes < 45) {
      normalized.setMinutes(30, 0, 0);
    } else {
      normalized.setHours(normalized.getHours() + 1, 0, 0, 0);
    }
    return normalized;
  };

  const formatTime = (date) => {
    if (!date) return 'Not set';
    return normalizeSleepDate(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toTimeString = (date) => {
    if (!date) return '22:00';
    const normalized = normalizeSleepDate(date);
    const h = String(normalized.getHours()).padStart(2, '0');
    const m = String(normalized.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const getSleepDurationHours = () => {
    if (!bedTime || !wakeTime) return 8;
    let diff = normalizeSleepDate(wakeTime).getTime() - normalizeSleepDate(bedTime).getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000;
    return Number((diff / (1000 * 60 * 60)).toFixed(2));
  };

  const getHeightCmValue = () => {
    if (unit === 'kg') return Number(heightCm);
    return Math.round(((Number(heightFt || 0) * 12) + Number(heightIn || 0)) * 2.54);
  };

  const getWeightKgValue = () =>
    unit === 'kg' ? Number(weight) : Number(weight) * 0.453592;

  const getBmi = () => {
    const hM = getHeightCmValue() / 100;
    if (!hM) return 0;
    return Number((getWeightKgValue() / (hM * hM)).toFixed(1));
  };

  const mapChronotype = () => sleepType || 'Intermediate';

  const mapEthnicity = () => {
    if (ethnicity === 'Black or African American') return 'African American';
    if (ethnicity === 'White') return 'Caucasian';
    if (ethnicity === 'Hispanic or Latino') return 'Hispanic';
    if (ethnicity === 'East Asian') return 'East Asian';
    if (ethnicity === 'South Asian') return 'South Asian';
    return 'Other';
  };

  const mapFamilyHistory = () => {
    if (familyHistory === 'Yes') return 'Yes';
    return 'No';
  };

  const getHeightDisplay = () => {
    if (unit === 'lbs') return `${heightFt || '0'} ft ${heightIn || '0'} in`;
    return `${heightCm || '0'} cm`;
  };

  const handleGeneratePrediction = async () => {
    if (submitting || !acknowledged) return;

    const payload = {
      // user_id comes from the JWT on the backend
      age: Number(age),
      bmi: getBmi(),
      ethnicity: mapEthnicity(),
      chronotype: mapChronotype(),
      family_history: mapFamilyHistory(),
      sleep_time: toTimeString(bedTime),
      wake_time: toTimeString(wakeTime),
      sleep_duration: getSleepDurationHours(),
    };

    log.debug('prediction payload', payload);

    try {
      setSubmitting(true);
      const result = await predictBrainHealth(payload);
      log.info('prediction received', { score: result.prediction, label: result.risk_label });
      await recordPredictionResult({ ...result, ...payload });
      navigation.navigate('Loading');
    } catch (err) {
      log.error('ReviewScreen.handleGeneratePrediction', err);
      Alert.alert('Prediction failed', parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.safeAreaTop} />
      <SafeAreaView style={styles.safeAreaBottom}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="chevron-left" size={28} color={colors.secondary} />
            </TouchableOpacity>
            <StepIndicator currentStep={5} totalSteps={5} />
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.contentWrapper}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Review your details</Text>

              <View style={styles.summaryCard}>
                {[
                  { icon: <Ionicons name="person" size={20} color={colors.accentSoft} />, label: 'Sleep type', value: sleepType || 'Not set' },
                  { icon: <Feather name="moon" size={20} color={colors.accentSoft} />, label: 'Bedtime', value: formatTime(bedTime) },
                  { icon: <Feather name="sun" size={20} color="#fcd53f" />, label: 'Wake-up time', value: formatTime(wakeTime) },
                  { icon: <Ionicons name="person" size={20} color={colors.accentSoft} />, label: 'Age', value: age || 'Not set' },
                  { icon: <MaterialCommunityIcons name="human-male-height" size={20} color={colors.accentSoft} />, label: 'Height', value: getHeightDisplay() },
                  { icon: <MaterialCommunityIcons name="weight" size={20} color={colors.accentSoft} />, label: 'Weight', value: `${weight || '0'} ${unit}` },
                  { icon: <Feather name="globe" size={20} color={colors.accentSoft} />, label: 'Ethnicity', value: ethnicity || 'Not set' },
                  { icon: <Ionicons name="people" size={20} color={colors.accentSoft} />, label: 'Sex', value: gender || 'Not set' },
                  { icon: <Feather name="heart" size={20} color={colors.accentSoft} />, label: 'Family history', value: familyHistory || 'Not set' },
                ].map((row, i, arr) => (
                  <View key={row.label}>
                    <View style={styles.row}>
                      <View style={styles.icon}>{row.icon}</View>
                      <Text style={styles.label}>{row.label}</Text>
                      <Text style={styles.value}>{row.value}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>

            <View style={styles.consentCard}>
              <Text style={styles.consentTitle}>Important — Research Use Only</Text>
              <Text style={styles.consentBody}>{RESEARCH_DISCLAIMER_SHORT}</Text>
              <TouchableOpacity onPress={() => setShowSources(true)} style={styles.sourcesToggle}>
                <Text style={styles.sourcesToggleText}>View full disclaimer and research sources</Text>
                <Feather name="info" size={15} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.ackRow} onPress={() => setAcknowledged(value => !value)} activeOpacity={0.8}>
                <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
                  {acknowledged && <Feather name="check" size={14} color={colors.onBrand} />}
                </View>
                <Text style={styles.ackText}>I understand this is a research score and not a medical diagnosis.</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={[styles.editButton, submitting && styles.buttonDisabled]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SleepType')}
              disabled={submitting}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.generateButton, (submitting || !acknowledged) && styles.generateButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleGeneratePrediction}
              disabled={submitting || !acknowledged}
            >
              {submitting
                ? (
                  <View style={styles.generateLoading}>
                    <ActivityIndicator color={colors.onBrand} />
                    <Text style={styles.generateButtonText}>Generating...</Text>
                  </View>
                )
                : <Text style={styles.generateButtonText}>Generate Research Score</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={showSources}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSources(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.researchModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About Your Research Score</Text>
              <TouchableOpacity onPress={() => setShowSources(false)} accessibilityLabel="Close">
                <Feather name="x" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
              <Text style={styles.modalSectionTitle}>Not a Clinical Diagnosis</Text>
              <Text style={styles.modalBody}>{RESEARCH_DISCLAIMER}</Text>
              <Text style={styles.modalSectionTitle}>How the Score Is Calculated</Text>
              <Text style={styles.modalBody}>{RESEARCH_METHODOLOGY}</Text>
              <Text style={styles.modalSectionTitle}>Research Sources</Text>
              {RESEARCH_SOURCES.map(source => (
                <TouchableOpacity key={source.label} onPress={() => Linking.openURL(source.url)} style={styles.modalLinkRow}>
                  <Text style={styles.modalLink}>{source.label} — View published research</Text>
                  <Feather name="external-link" size={13} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowSources(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeAreaTop: { flex: 0, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeAreaBottom: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  backButton: { padding: 4 },
  contentWrapper: { flex: 1 },
  contentContainer: { paddingBottom: 8 },
  title: { fontSize: 30, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', color: colors.text, textAlign: 'center', lineHeight: 38, marginTop: 6, marginBottom: 16 },
  consentCard: { backgroundColor: colors.warningSurface, borderRadius: 12, borderWidth: 1, borderColor: colors.warningBorder, padding: 12, marginTop: 12, marginBottom: 8 },
  consentTitle: { color: colors.warningStrong, fontSize: 12, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginBottom: 6 },
  consentBody: { color: colors.warningBody, fontSize: 10, lineHeight: 15, marginBottom: 6 },
  sourcesToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5 },
  sourcesToggleText: { color: colors.accent, fontSize: 11, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  ackRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, gap: 9 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.brand },
  ackText: { flex: 1, color: colors.text, fontSize: 11, lineHeight: 16, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },
  summaryCard: { backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1.5, borderColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  icon: { marginRight: 16, width: 24, textAlign: 'center' },
  label: { color: colors.neutralText, fontSize: 16, fontFamily: 'Lexend_500Medium', fontWeight: 'normal', flex: 1 },
  value: { color: colors.text, fontSize: 16, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal', textAlign: 'right', flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.border, width: '100%' },
  bottomButtons: { flexDirection: 'row', marginBottom: 12, marginTop: 10, gap: 12 },
  editButton: { flex: 1, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.accent, paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  editButtonText: { color: colors.accent, fontSize: 18, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },
  generateButton: { flex: 2, backgroundColor: colors.brandSoft, paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  generateButtonDisabled: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.55 },
  generateLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  generateButtonText: { color: colors.onBrand, fontSize: 18, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  researchModal: { width: '100%', maxWidth: 520, maxHeight: '82%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.accent + '66', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 18, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', flex: 1 },
  modalScroll: { flexGrow: 0 },
  modalSectionTitle: { color: colors.text, fontSize: 13, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginTop: 10, marginBottom: 5 },
  modalBody: { color: colors.secondary, fontSize: 12, lineHeight: 19 },
  modalLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 7 },
  modalLink: { color: colors.accent, fontSize: 12, lineHeight: 17, textDecorationLine: 'underline', flex: 1 },
  modalCloseButton: { backgroundColor: colors.brand, borderRadius: 10, alignItems: 'center', paddingVertical: 11, marginTop: 14 },
  modalCloseText: { color: colors.onBrand, fontSize: 14, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
});
