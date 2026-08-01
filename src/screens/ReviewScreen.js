import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, Image, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import StepIndicator from '../components/StepIndicator';
import { useOnboarding } from '../context/OnboardingContext';
import { predictBrainHealth } from '../api/predict';
import { parseApiError } from '../utils/errors';
import { log } from '../utils/logger';

export default function ReviewScreen({ navigation }) {
  const [submitting, setSubmitting] = useState(false);

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
    if (submitting) return;

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
            colors={['#030827', '#030A31']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}
          />

          <View style={styles.imageContainer}>
            <Image
              source={require('../assets/home1.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient colors={['transparent', '#030A31']} style={styles.imageOverlay} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="chevron-left" size={28} color="#ffffff" />
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
                  { icon: <Ionicons name="person" size={20} color="#8a52f3" />, label: 'Sleep type', value: sleepType || 'Not set' },
                  { icon: <Feather name="moon" size={20} color="#8a52f3" />, label: 'Bedtime', value: formatTime(bedTime) },
                  { icon: <Feather name="sun" size={20} color="#fcd53f" />, label: 'Wake-up time', value: formatTime(wakeTime) },
                  { icon: <Ionicons name="person" size={20} color="#8a52f3" />, label: 'Age', value: age || 'Not set' },
                  { icon: <MaterialCommunityIcons name="human-male-height" size={20} color="#8a52f3" />, label: 'Height', value: getHeightDisplay() },
                  { icon: <MaterialCommunityIcons name="weight" size={20} color="#8a52f3" />, label: 'Weight', value: `${weight || '0'} ${unit}` },
                  { icon: <Feather name="globe" size={20} color="#8a52f3" />, label: 'Ethnicity', value: ethnicity || 'Not set' },
                  { icon: <Ionicons name="people" size={20} color="#8a52f3" />, label: 'Sex', value: gender || 'Not set' },
                  { icon: <Feather name="heart" size={20} color="#8a52f3" />, label: 'Family history', value: familyHistory || 'Not set' },
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
              style={[styles.generateButton, submitting && styles.generateButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleGeneratePrediction}
              disabled={submitting}
            >
              {submitting
                ? (
                  <View style={styles.generateLoading}>
                    <ActivityIndicator color="#ffffff" />
                    <Text style={styles.generateButtonText}>Generating...</Text>
                  </View>
                )
                : <Text style={styles.generateButtonText}>Generate Prediction</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeAreaTop: { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeAreaBottom: { flex: 1, backgroundColor: '#030A31' },
  container: { flex: 1, backgroundColor: '#030A31', paddingHorizontal: 20 },
  imageContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: -1 },
  heroImage: { width: '100%', height: '100%', opacity: 0.9 },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  backButton: { padding: 4 },
  contentWrapper: { flex: 1, justifyContent: 'flex-start', paddingTop: 40 },
  textContainer: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 10 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', lineHeight: 38, marginBottom: 12 },
  cardScrollView: { flex: 1 },
  cardScrollContent: { paddingBottom: 18 },
  summaryCard: { backgroundColor: '#161b3d', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1.5, borderColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  icon: { marginRight: 16, width: 24, textAlign: 'center' },
  label: { color: '#e0e0e0', fontSize: 16, fontWeight: '500', flex: 1 },
  value: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  divider: { height: 1, backgroundColor: '#1f254f', width: '100%' },
  bottomButtons: { flexDirection: 'row', marginBottom: 20, marginTop: 12, gap: 12 },
  editButton: { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#4d4178', paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  editButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  generateButton: { flex: 2, backgroundColor: '#8a52f3', paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  generateButtonDisabled: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.55 },
  generateLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  generateButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
});
