import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getCognitiveTests } from '../api/cognitive';
import { getPredictions } from '../api/predict';
import { getSleepLogs } from '../api/sleepLogs';
import { getMe } from '../api/users';
import { useOnboarding } from '../context/OnboardingContext';
import { log } from '../utils/logger';
import {
  RESEARCH_DISCLAIMER,
  RESEARCH_METHODOLOGY,
  RESEARCH_SOURCES,
  researchSourcesText,
} from '../constants/researchDisclosure';

function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtPercent(value) {
  return value == null ? '—' : `${Number(value).toFixed(1)}%`;
}

function scoreLabel(score) {
  if (score == null) return 'Not available';
  if (score >= 60) return 'Higher similarity';
  if (score >= 30) return 'Moderate similarity';
  return 'Lower similarity';
}

function average(values) {
  const valid = values.filter(value => Number.isFinite(Number(value)));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
}

function displayValue(value, suffix = '') {
  if (value === undefined || value === null || value === '') return '—';
  return `${value}${suffix}`;
}

function displayTime(value) {
  if (!value) return '—';
  if (typeof value === 'string' && value.length >= 5) return value.slice(0, 5);
  return String(value);
}

function modelInputRows(prediction, fallbackInputs = {}) {
  const source = { ...fallbackInputs, ...(prediction || {}) };
  return [
    ['Chronotype', displayValue(source.chronotype)],
    ['Age', displayValue(source.age)],
    ['BMI', displayValue(source.bmi)],
    ['Sleep time', displayTime(source.sleep_time)],
    ['Wake time', displayTime(source.wake_time)],
    ['Sleep duration', source.sleep_duration == null ? '—' : `${Number(source.sleep_duration).toFixed(1)} hours`],
    ['Ethnicity', displayValue(source.ethnicity)],
  ];
}

function reportText({ profile, latestPrediction, sleepLogs, cognitiveTests, fallbackInputs }) {
  const sleepAvg = average(sleepLogs.map(item => item.duration_hours));
  const sleepQuality = average(sleepLogs.map(item => item.quality_score));
  const inputLines = modelInputRows(latestPrediction, fallbackInputs).map(([label, value]) => `${label}: ${value}`);
  const factorLines = [
    ['Chronotype', latestPrediction?.factor_contributions?.chronotype],
    ['Age', latestPrediction?.factor_contributions?.age],
    ['Sleep time', latestPrediction?.factor_contributions?.sleep_time],
    ['Wake time', latestPrediction?.factor_contributions?.wake_time],
    ['BMI', latestPrediction?.factor_contributions?.bmi],
    ['Ethnicity', latestPrediction?.factor_contributions?.ethnicity],
  ].map(([label, value]) => `${label}: ${value == null ? '—' : `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(1)}%`}`);
  const lines = [
    'ADChronotype Monthly Summary',
    '',
    `Patient: ${profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '—'}`,
    `Generated: ${fmtDate(new Date().toISOString())}`,
    '',
    'Similarity Score',
    `Latest score: ${fmtPercent(latestPrediction?.prediction)}`,
    `Category: ${scoreLabel(latestPrediction?.prediction)}`,
    `Baseline: ${fmtPercent(latestPrediction?.baseline)}`,
    'Interpretation: Positive factors increased the similarity score from baseline; negative factors lowered it.',
    '',
    'Model Inputs Used',
    ...inputLines,
    'Note: Height and weight are converted into BMI before prediction.',
    '',
    'Factor Breakdown',
    ...factorLines,
    '',
    'Sleep Summary',
    `Logged nights: ${sleepLogs.length}`,
    `Average duration: ${sleepAvg == null ? '—' : `${sleepAvg.toFixed(1)} hours`}`,
    `Average sleep quality: ${sleepQuality == null ? '—' : `${sleepQuality.toFixed(1)} / 21`}`,
    '',
    'Cognitive Test Summary',
    ...(cognitiveTests.length
      ? cognitiveTests.slice(0, 8).map(item => `${item.test_type}: ${item.score} ${item.unit || ''} (Attempt ${item.attempt_number || 1})`)
      : ['No saved cognitive test results yet.']),
    '',
    'Important — Research Use Only',
    RESEARCH_DISCLAIMER,
    RESEARCH_METHODOLOGY,
    '',
    researchSourcesText(),
  ];
  return lines.join('\n');
}

export default function DoctorReportScreen({ navigation }) {
  const {
    predictionResult,
    sleepType,
    bedTime,
    wakeTime,
    age,
    heightFt,
    heightIn,
    heightCm,
    weight,
    unit,
    ethnicity,
    familyHistory,
  } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [sleepLogs, setSleepLogs] = useState([]);
  const [cognitiveTests, setCognitiveTests] = useState([]);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, predictionData, sleepData, cognitiveData] = await Promise.all([
        getMe().catch(() => null),
        getPredictions(1).catch(() => []),
        getSleepLogs(1).catch(() => []),
        getCognitiveTests(undefined, 1).catch(() => []),
      ]);
      setProfile(profileData);
      setPredictions(Array.isArray(predictionData) ? predictionData : []);
      setSleepLogs(Array.isArray(sleepData) ? sleepData.slice(0, 30) : []);
      setCognitiveTests(Array.isArray(cognitiveData) ? cognitiveData : []);
      log.info('DoctorReportScreen: report data loaded');
    } catch (err) {
      log.warn('DoctorReportScreen: report data unavailable', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  const getHeightCmValue = () => {
    if (unit === 'kg' && heightCm) return Number(heightCm);
    if (heightFt) return Math.round(((Number(heightFt || 0) * 12) + Number(heightIn || 0)) * 2.54);
    return null;
  };

  const getWeightKgValue = () => {
    if (!weight) return null;
    return unit === 'kg' ? Number(weight) : Number(weight) * 0.453592;
  };

  const localHeightCm = getHeightCmValue();
  const localWeightKg = getWeightKgValue();
  const localBmi = localHeightCm && localWeightKg
    ? Number((localWeightKg / ((localHeightCm / 100) ** 2)).toFixed(1))
    : null;

  const formatLocalTime = (date) => {
    if (!date) return null;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  };

  const fallbackInputs = {
    chronotype: sleepType,
    age,
    bmi: localBmi,
    sleep_time: formatLocalTime(bedTime),
    wake_time: formatLocalTime(wakeTime),
    ethnicity,
    family_history: familyHistory,
  };

  const latestPrediction = predictionResult || predictions[0] || null;
  const factors = latestPrediction?.factor_contributions || {};
  const sleepAvg = average(sleepLogs.map(item => item.duration_hours));
  const sleepQuality = average(sleepLogs.map(item => item.quality_score));
  const generatedText = reportText({ profile, latestPrediction, sleepLogs, cognitiveTests, fallbackInputs });

  async function handleExport() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
      return;
    }

    try {
      await Share.share({ title: 'ADChronotype Monthly Summary', message: generatedText });
    } catch (err) {
      Alert.alert('Report unavailable', 'The report could not be shared right now.');
      log.warn('DoctorReportScreen: share failed', err?.message);
    }
  }

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <View style={styles.root}>
        <LinearGradient colors={['#FDF6F0', '#FDF6F0']} style={StyleSheet.absoluteFillObject} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Feather name="chevron-left" size={28} color="#8A6A4E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Doctor Report</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={handleExport} activeOpacity={0.75}>
            <Feather name={Platform.OS === 'web' ? 'printer' : 'share-2'} size={18} color="#E07B3C" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#F0955A" size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <MaterialCommunityIcons name="file-chart-outline" size={30} color="#E07B3C" />
              </View>
              <Text style={styles.title}>Monthly Summary</Text>
              <Text style={styles.subtitle}>
                A monthly summary you can review or bring to a general physician appointment.
              </Text>
              <Text style={styles.generated}>Generated {fmtDate(new Date().toISOString())}</Text>
            </View>

            <View style={styles.noticeCard}>
              <Feather name="alert-triangle" size={18} color="#E9A94A" />
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>Important — Research Use Only</Text>
                <Text style={styles.noticeText}>{RESEARCH_DISCLAIMER}</Text>
                <Text style={styles.noticeText}>{RESEARCH_METHODOLOGY}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Similarity Score</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreValue}>{fmtPercent(latestPrediction?.prediction)}</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>{scoreLabel(latestPrediction?.prediction)}</Text>
                </View>
              </View>
              <Text style={styles.muted}>Baseline: {fmtPercent(latestPrediction?.baseline)}</Text>
              <Text style={styles.explainText}>
                The score is a statistical similarity measure. The baseline is the starting model value for this profile, and the factor values below show which inputs moved the score up or down.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Inputs Used for This Score</Text>
              {modelInputRows(latestPrediction, fallbackInputs).map(([label, value]) => (
                <View key={label} style={styles.inputRow}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <Text style={styles.inputValue}>{value}</Text>
                </View>
              ))}
              <Text style={styles.explainText}>
                Height and weight are converted into BMI before prediction. These are the values the model uses for the score shown above.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Factor Breakdown</Text>
              <Text style={[styles.explainText, { marginTop: -4 }]}>
                Positive values increased the similarity score. Negative values lowered it. This helps identify which entered factors had the largest effect on this result.
              </Text>
              {[
                ['Chronotype', factors.chronotype],
                ['Age', factors.age],
                ['Sleep Time', factors.sleep_time],
                ['Wake Time', factors.wake_time],
                ['BMI', factors.bmi],
                ['Ethnicity', factors.ethnicity],
              ].map(([label, value]) => (
                <View key={label} style={styles.factorRow}>
                  <Text style={styles.factorLabel}>{label}</Text>
                  <Text style={[styles.factorValue, { color: Number(value) > 0 ? '#D9694F' : '#7EC49A' }]}>
                    {value == null ? '—' : `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(1)}%`}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Research Sources</Text>
              {RESEARCH_SOURCES.map(source => (
                <TouchableOpacity
                  key={source.label}
                  style={styles.sourceRow}
                  onPress={() => Linking.openURL(source.url)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.sourceText}>{source.label} — View published research</Text>
                  <Feather name="external-link" size={14} color="#E07B3C" />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sleep Summary</Text>
              <View style={styles.metricRow}>
                <Metric label="Logged nights" value={sleepLogs.length} />
                <Metric label="Avg duration" value={sleepAvg == null ? '—' : `${sleepAvg.toFixed(1)}h`} />
                <Metric label="Avg quality" value={sleepQuality == null ? '—' : `${sleepQuality.toFixed(1)}/21`} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Cognitive Results</Text>
              {cognitiveTests.length ? (
                cognitiveTests.slice(0, 6).map(item => (
                  <View key={item.id || `${item.test_type}-${item.tested_at}`} style={styles.resultRow}>
                    <View>
                      <Text style={styles.resultTitle}>{item.test_type?.replace(/_/g, ' ') || 'Cognitive test'}</Text>
                      <Text style={styles.muted}>Attempt {item.attempt_number || 1} · {fmtDate(item.tested_at)}</Text>
                    </View>
                    <Text style={styles.resultScore}>{item.score} {item.unit || ''}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No saved cognitive test results yet.</Text>
              )}
            </View>

            <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.85}>
              <Feather name={Platform.OS === 'web' ? 'printer' : 'share-2'} size={18} color="#fff" />
              <Text style={styles.exportText}>Export Report for General Physician</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 0, backgroundColor: '#FDF6F0', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  root: { flex: 1, backgroundColor: '#FDF6F0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E2D4',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#3D2B1F', fontSize: 18, fontWeight: '800' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 18, paddingBottom: 42 },
  heroCard: {
    backgroundColor: '#FDF6F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E2D4',
    padding: 18,
    marginBottom: 12,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#E07B3C22',
    borderWidth: 1,
    borderColor: '#E07B3C44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: '#3D2B1F', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  subtitle: { color: '#8A6A4E', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  generated: { color: '#8A6A4E', fontSize: 11, fontWeight: '700' },
  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FBEED2',
    borderWidth: 1,
    borderColor: '#E9A94A66',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  noticeContent: { flex: 1 },
  noticeTitle: { color: '#ffcf66', fontSize: 12, lineHeight: 18, fontWeight: '800', marginBottom: 4 },
  noticeText: { color: '#9A6A1E', fontSize: 11, lineHeight: 17, marginBottom: 5 },
  section: {
    backgroundColor: '#FDF6F0',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E2D4',
    padding: 15,
    marginBottom: 12,
  },
  sectionTitle: { color: '#3D2B1F', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  scoreValue: { color: '#7EC49A', fontSize: 36, fontWeight: '900' },
  scoreBadge: { backgroundColor: '#7EC49A22', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  scoreBadgeText: { color: '#7EC49A', fontSize: 12, fontWeight: '800' },
  muted: { color: '#8A6A4E', fontSize: 11, lineHeight: 16 },
  explainText: { color: '#8A6A4E', fontSize: 11, lineHeight: 17, marginTop: 10 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0E2D4' },
  inputLabel: { color: '#8A6A4E', fontSize: 12, fontWeight: '700' },
  inputValue: { color: '#3D2B1F', fontSize: 12, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  factorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0E2D4' },
  factorLabel: { color: '#8A6A4E', fontSize: 13, fontWeight: '700' },
  factorValue: { fontSize: 17, fontWeight: '900' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0E2D4' },
  sourceText: { color: '#E07B3C', fontSize: 12, lineHeight: 17, textDecorationLine: 'underline', flex: 1 },
  metricRow: { flexDirection: 'row', gap: 8 },
  metricCard: { flex: 1, backgroundColor: '#FDF6F0', borderRadius: 12, borderWidth: 1, borderColor: '#F0E2D4', padding: 12 },
  metricValue: { color: '#E07B3C', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  metricLabel: { color: '#8A6A4E', fontSize: 10, fontWeight: '700' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0E2D4' },
  resultTitle: { color: '#3D2B1F', fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  resultScore: { color: '#E07B3C', fontSize: 13, fontWeight: '900' },
  emptyText: { color: '#8A6A4E', fontSize: 12, lineHeight: 18 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E07B3C',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 14,
  },
  exportText: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
