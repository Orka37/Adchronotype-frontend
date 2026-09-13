import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, Image, Alert, ActivityIndicator, ScrollView, Linking, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
          <LinearGradient
            colors={['#FDF6F0', '#FDF6F0']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}
          />

          <View style={styles.imageContainer}>
            <Image
              source={require('../assets/home1.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient colors={['transparent', '#FDF6F0']} style={styles.imageOverlay} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="chevron-left" size={28} color="#8A6A4E" />
            </TouchableOpacity>
            <StepIndicator currentStep={5} totalSteps={5} />
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.contentWrapper}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>Review your details</Text>
            </View>

            <ScrollView
              style={styles.cardScrollView}
              contentContainerStyle={styles.cardScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.summaryCard}>
                {[
                  { icon: <Ionicons name="person" size={20} color="#F0955A" />, label: 'Sleep type', value: sleepType || 'Not set' },
                  { icon: <Feather name="moon" size={20} color="#F0955A" />, label: 'Bedtime', value: formatTime(bedTime) },
                  { icon: <Feather name="sun" size={20} color="#fcd53f" />, label: 'Wake-up time', value: formatTime(wakeTime) },
                  { icon: <Ionicons name="person" size={20} color="#F0955A" />, label: 'Age', value: age || 'Not set' },
                  { icon: <MaterialCommunityIcons name="human-male-height" size={20} color="#F0955A" />, label: 'Height', value: getHeightDisplay() },
                  { icon: <MaterialCommunityIcons name="weight" size={20} color="#F0955A" />, label: 'Weight', value: `${weight || '0'} ${unit}` },
                  { icon: <Feather name="globe" size={20} color="#F0955A" />, label: 'Ethnicity', value: ethnicity || 'Not set' },
                  { icon: <Ionicons name="people" size={20} color="#F0955A" />, label: 'Sex', value: gender || 'Not set' },
                  { icon: <Feather name="heart" size={20} color="#F0955A" />, label: 'Family history', value: familyHistory || 'Not set' },
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
            </ScrollView>

            <View style={styles.consentCard}>
              <Text style={styles.consentTitle}>Important — Research Use Only</Text>
              <Text style={styles.consentBody}>{RESEARCH_DISCLAIMER_SHORT}</Text>
              <TouchableOpacity onPress={() => setShowSources(true)} style={styles.sourcesToggle}>
                <Text style={styles.sourcesToggleText}>View full disclaimer and research sources</Text>
                <Feather name="info" size={15} color="#E07B3C" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.ackRow} onPress={() => setAcknowledged(value => !value)} activeOpacity={0.8}>
                <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
                  {acknowledged && <Feather name="check" size={14} color="#ffffff" />}
                </View>
                <Text style={styles.ackText}>I understand this is a research score and not a medical diagnosis.</Text>
              </TouchableOpacity>
            </View>
          </View>

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
                    <ActivityIndicator color="#ffffff" />
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
                <Feather name="x" size={22} color="#8A6A4E" />
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
                  <Feather name="external-link" size={13} color="#E07B3C" />
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

const styles = StyleSheet.create({
  safeAreaTop: { flex: 0, backgroundColor: '#FDF6F0', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeAreaBottom: { flex: 1, backgroundColor: '#FDF6F0' },
  container: { flex: 1, backgroundColor: '#FDF6F0', paddingHorizontal: 20 },
  imageContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: -1 },
  heroImage: { width: '100%', height: '100%', opacity: 0.9 },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  backButton: { padding: 4 },
  contentWrapper: { flex: 1, justifyContent: 'flex-start', paddingTop: 40 },
  textContainer: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 10 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#3D2B1F', textAlign: 'center', lineHeight: 38, marginBottom: 12 },
  consentCard: { backgroundColor: '#FBEED2', borderRadius: 12, borderWidth: 1, borderColor: '#F0D9A8', padding: 12, marginBottom: 10 },
  consentTitle: { color: '#9A3412', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  consentBody: { color: '#7C4A1E', fontSize: 10, lineHeight: 15, marginBottom: 6 },
  sourcesToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5 },
  sourcesToggleText: { color: '#E07B3C', fontSize: 11, fontWeight: '700' },
  ackRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, gap: 9 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#F0955A', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#E07B3C' },
  ackText: { flex: 1, color: '#3D2B1F', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  cardScrollView: { flex: 1 },
  cardScrollContent: { paddingBottom: 18 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1.5, borderColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  icon: { marginRight: 16, width: 24, textAlign: 'center' },
  label: { color: '#4B5563', fontSize: 16, fontWeight: '500', flex: 1 },
  value: { color: '#3D2B1F', fontSize: 16, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  divider: { height: 1, backgroundColor: '#F0E2D4', width: '100%' },
  bottomButtons: { flexDirection: 'row', marginBottom: 20, marginTop: 12, gap: 12 },
  editButton: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E07B3C', paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  editButtonText: { color: '#E07B3C', fontSize: 18, fontWeight: '600' },
  generateButton: { flex: 2, backgroundColor: '#F0955A', paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  generateButtonDisabled: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.55 },
  generateLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  generateButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  researchModal: { width: '100%', maxWidth: 520, maxHeight: '82%', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E07B3C66', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  modalTitle: { color: '#3D2B1F', fontSize: 18, fontWeight: '800', flex: 1 },
  modalScroll: { flexGrow: 0 },
  modalSectionTitle: { color: '#3D2B1F', fontSize: 13, fontWeight: '800', marginTop: 10, marginBottom: 5 },
  modalBody: { color: '#8A6A4E', fontSize: 12, lineHeight: 19 },
  modalLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 7 },
  modalLink: { color: '#E07B3C', fontSize: 12, lineHeight: 17, textDecorationLine: 'underline', flex: 1 },
  modalCloseButton: { backgroundColor: '#E07B3C', borderRadius: 10, alignItems: 'center', paddingVertical: 11, marginTop: 14 },
  modalCloseText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
