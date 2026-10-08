import Svg, { Circle } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../theme/designTheme';
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
import { Feather } from '@expo/vector-icons';
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
    ['Bedtime', displayTime(source.sleep_time)],
    ['Wake-up time', displayTime(source.wake_time)],
    ['Sleep duration', source.sleep_duration == null ? '—' : `${Number(source.sleep_duration).toFixed(1)} hours`],
    ['Ethnicity', displayValue(source.ethnicity)],
  ];
}

function durationLabel(hours) { const mins=Math.round(Number(hours)*60); return Math.floor(mins/60)+'h '+mins%60+'m'; }
function compactInputRows(prediction,fallback) {
 const p={...fallback,...(prediction||{})};
 return [['Chronotype',displayValue(p.chronotype)],['Sleep time · Wake time',displayTime(p.sleep_time)+' · '+displayTime(p.wake_time)],['Sleep duration',p.sleep_duration==null?'—':durationLabel(p.sleep_duration)],['Age · BMI',displayValue(p.age)+' · '+displayValue(p.bmi)],['Family history',displayValue(p.family_history)],['Ethnicity',displayValue(p.ethnicity)]];
}

function reportText({ profile, latestPrediction, sleepLogs, cognitiveTests, fallbackInputs }) {
  const sleepAvg = average(sleepLogs.map(item => item.duration_hours));
  const sleepQuality = average(sleepLogs.map(item => item.quality_score));
  const inputLines = modelInputRows(latestPrediction, fallbackInputs).map(([label, value]) => `${label}: ${value}`);
  const factorLines = [
    ['Chronotype', latestPrediction?.factor_contributions?.chronotype],
    ['Age', latestPrediction?.factor_contributions?.age],
    ['Bedtime', latestPrediction?.factor_contributions?.sleep_time],
    ['Wake-up time', latestPrediction?.factor_contributions?.wake_time],
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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

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
  const [showDetails, setShowDetails] = useState(false);
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
      const cutoff = new Date(); cutoff.setHours(0,0,0,0); cutoff.setDate(cutoff.getDate()-29);
      setSleepLogs(Array.isArray(sleepData) ? sleepData.filter(item => new Date(item.logged_date?.length===10?item.logged_date+'T00:00:00':item.logged_date) >= cutoff && new Date(item.logged_date?.length===10?item.logged_date+'T00:00:00':item.logged_date) <= new Date()) : []);
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
        <LinearGradient colors={[colors.background, colors.background]} style={StyleSheet.absoluteFillObject} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Feather name="chevron-left" size={28} color={colors.secondary} />
          </TouchableOpacity>
          <View style={{flex:1}}><Text style={styles.headerTitle}>Doctor Report</Text><Text style={styles.muted}>Monthly Summary · {new Date().toLocaleDateString(undefined,{month:'long',year:'numeric'})}</Text></View>

        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accentSoft} size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <TouchableOpacity accessibilityRole="button" onPress={()=>setShowDetails(v=>!v)} style={styles.noticeCard}>
              <Feather name="alert-triangle" size={18} color={colors.warningStrong}/><View style={{flex:1}}><Text style={styles.noticeTitle}>Important — Research Use Only</Text><Text style={styles.noticeText}>For context in a conversation with a general physician. Not a diagnostic report.</Text><Text style={[styles.noticeText,{textDecorationLine:'underline',marginTop:4}]}>{showDetails?'Hide':'Read'} full disclaimer and sources</Text></View>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>SIMILARITY SCORE</Text>
            <View style={[styles.section,styles.scoreRow]}>
              <View style={{width:72,height:72}}><Svg width={72} height={72} viewBox="0 0 72 72"><Circle cx="36" cy="36" r="30" fill="none" stroke={colors.tint} strokeWidth="7"/><Circle cx="36" cy="36" r="30" fill="none" stroke={colors.accent} strokeWidth="7" strokeLinecap="round" strokeDasharray={2*Math.PI*30} strokeDashoffset={2*Math.PI*30*(1-Math.min(100,Math.max(0,Number(latestPrediction?.prediction)||0))/100)} rotation="-90" origin="36,36"/></Svg><View style={{position:'absolute',top:0,left:0,right:0,bottom:0,alignItems:'center',justifyContent:'center'}}><Text style={{fontFamily:'Lexend_800ExtraBold',fontSize:17,color:colors.accent}}>{fmtPercent(latestPrediction?.prediction)}</Text></View></View>
              <View style={{flex:1,gap:3}}><Text style={[styles.scoreBadgeText,{color:latestPrediction?.prediction>=30?colors.warningStrong:colors.successText}]}>{scoreLabel(latestPrediction?.prediction)}</Text><Text style={styles.muted}>Compared with patterns in published Alzheimer's research data.</Text></View>
            </View>
            <Text style={styles.sectionTitle}>INPUTS USED FOR THIS SCORE</Text>
            <View style={styles.section}>{compactInputRows(latestPrediction,fallbackInputs).map(([label,value],i,rows)=><View key={label} style={[styles.inputRow,i===rows.length-1&&{borderBottomWidth:0}]}><Text style={styles.inputLabel}>{label}</Text><Text style={styles.inputValue}>{value}</Text></View>)}</View>
            {showDetails && <><View style={[styles.section,{paddingVertical:14,gap:10}]}><Text style={styles.noticeText}>{RESEARCH_DISCLAIMER}</Text><Text style={styles.explainText}>{RESEARCH_METHODOLOGY}</Text><Text style={styles.muted}>Baseline: {fmtPercent(latestPrediction?.baseline)}</Text></View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Factor Breakdown</Text>
              <Text style={[styles.explainText, { marginTop: -4 }]}>
                Positive values increased the similarity score. Negative values lowered it. This helps identify which entered factors had the largest effect on this result.
              </Text>
              {[
                ['Chronotype', factors.chronotype],
                ['Age', factors.age],
                ['Bedtime', factors.sleep_time],
                ['Wake-up Time', factors.wake_time],
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
                  <Feather name="external-link" size={14} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </View>

            </>}
            <Text style={styles.sectionTitle}>SLEEP SUMMARY · LAST 30 DAYS</Text>
            <View style={styles.metricRow}><Metric label="AVG SLEEP" value={sleepAvg==null?'—':durationLabel(sleepAvg)}/><Metric label="QUALITY" value={sleepQuality==null?'—':sleepQuality.toFixed(1)+'/21'}/><Metric label="NIGHTS LOGGED" value={sleepLogs.length}/></View>
            <Text style={styles.sectionTitle}>RECENT COGNITIVE RESULTS</Text>
            <View style={styles.section}>{cognitiveTests.length?cognitiveTests.slice(0,6).map(item=><View key={item.id||item.test_type+'-'+item.tested_at} style={styles.resultRow}><Text style={[styles.resultTitle,{flex:1}]}>{item.test_type?.replace(/_/g,' ')||'Cognitive test'}</Text><Text style={styles.resultScore}>{item.score} {item.unit||''}</Text></View>):<Text style={[styles.emptyText,{paddingVertical:14}]}>No saved cognitive test results yet.</Text>}</View>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.85}>
              <Feather name={Platform.OS === 'web' ? 'printer' : 'share-2'} size={18} color={colors.onBrand} />
              <Text style={styles.exportText}>Export Report for General Physician</Text>
            </TouchableOpacity>

          </ScrollView>
        )}
      </View>
    </>
  );
}

function Metric({ label, value }) {

  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeTop: { flex: 0, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  root: { flex: 1, backgroundColor: colors.background },
  header: {flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingTop:16,paddingBottom:14},
  backBtn: {width:44,height:44,alignItems:'center',justifyContent:'center'},

  headerTitle: {color:colors.text,fontSize:22,fontFamily:'Lexend_800ExtraBold'},
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {paddingHorizontal:20,paddingBottom:28,gap:14},

  noticeCard: {flexDirection:'row',gap:10,backgroundColor:colors.warningSurface,borderWidth:1,borderColor:colors.warningBorder,borderRadius:14,paddingVertical:12,paddingHorizontal:14},

  noticeTitle: {color:colors.warningStrong,fontSize:12.5,fontFamily:'Lexend_800ExtraBold',marginBottom:3},
  noticeText: {color:colors.warningBody,fontSize:12,fontFamily:'Lexend_400Regular',lineHeight:18},
  section: {backgroundColor:colors.surface,borderRadius:16,borderWidth:1,borderColor:colors.border,paddingVertical:2,paddingHorizontal:16},
  sectionTitle: {color:colors.accent,fontSize:11,fontFamily:'Lexend_800ExtraBold',letterSpacing:1.1,textTransform:'uppercase'},
  scoreRow: {flexDirection:'row',alignItems:'center',gap:16,paddingVertical:14},

  scoreBadgeText: {color:colors.successText,fontSize:16,fontFamily:'Lexend_800ExtraBold'},
  muted: {color:colors.secondary,fontSize:12.5,fontFamily:'Lexend_400Regular',lineHeight:18.125},
  explainText: {fontFamily:'Lexend_400Regular', color: colors.secondary, fontSize: 11, lineHeight: 17, marginTop: 10 },
  inputRow: {flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,minHeight:42,paddingVertical:8,borderBottomWidth:1,borderBottomColor:colors.border},
  inputLabel: {color:colors.secondary,fontSize:13.5,fontFamily:'Lexend_400Regular',flexShrink:1},
  inputValue: {color:colors.text,fontSize:13.5,fontFamily:'Lexend_700Bold',textAlign:'right',flexShrink:1},
  factorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  factorLabel: { color: colors.secondary, fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  factorValue: { fontSize: 17, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  sourceText: {fontFamily:'Lexend_400Regular', color: colors.accent, fontSize: 12, lineHeight: 17, textDecorationLine: 'underline', flex: 1 },
  metricRow: { flexDirection: 'row', gap: 8 },
  metricCard: {flex:1,backgroundColor:colors.surface,borderRadius:14,borderWidth:1,borderColor:colors.border,paddingVertical:12,paddingHorizontal:6,alignItems:'center'},
  metricValue: {color:colors.text,fontSize:17,fontFamily:'Lexend_800ExtraBold',marginBottom:2},
  metricLabel: {color:colors.secondary,fontSize:10,fontFamily:'Lexend_700Bold',textAlign:'center'},
  resultRow: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,minHeight:42,paddingVertical:8,borderBottomWidth:1,borderBottomColor:colors.border},
  resultTitle: {color:colors.secondary,fontSize:13.5,fontFamily:'Lexend_400Regular',textTransform:'capitalize'},
  resultScore: {color:colors.text,fontSize:13.5,fontFamily:'Lexend_700Bold'},
  emptyText: {fontFamily:'Lexend_400Regular', color: colors.secondary, fontSize: 12, lineHeight: 18 },
  exportBtn: {flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:colors.brand,borderRadius:16,minHeight:54,paddingHorizontal:14,paddingVertical:10},
  exportText: {color:colors.onBrand,fontSize:15,fontFamily:'Lexend_700Bold',textAlign:'center'},
});
