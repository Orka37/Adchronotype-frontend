import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  ScrollView, Platform, RefreshControl, Animated, Linking, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useOnboarding } from '../context/OnboardingContext';
import { useCaregiverRequestCount } from '../hooks/useCaregiverRequestCount';
import { log } from '../utils/logger';
import {
  RESEARCH_DISCLAIMER,
  RESEARCH_DISCLAIMER_SHORT,
  RESEARCH_METHODOLOGY,
  RESEARCH_SOURCES,
} from '../constants/researchDisclosure';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SUGGESTIONS = [
  {
    cat: 'CHRONOTYPE',
    icon: '🌙',
    title: "What's Your Chronotype?",
    body: "Your sleep timing is tied to your biological clock. Learn how your chronotype affects brain health.",
    links: [
      { label: 'Sleep Foundation — Chronotype Guide', url: 'https://www.sleepfoundation.org/circadian-rhythm/chronotype' },
      { label: 'Healthline — Can You Change Your Chronotype?', url: 'https://www.healthline.com/health/sleep/chronotype' },
      { label: 'Take the Chronotype Quiz (MEQ)', url: 'https://www.cet-surveys.com/index.php?sid=61524' },
    ],
  },
  {
    cat: 'SLEEP QUALITY',
    icon: '😴',
    title: 'How Sleep Protects Your Brain',
    body: "During deep sleep your brain flushes out toxic proteins linked to Alzheimer's. Consistent quality sleep is one of the most powerful protective factors.",
    links: [
      { label: "Alzheimer's Association — Sleep & Alzheimer's", url: 'https://www.alz.org/alzheimers-dementia/research_progress/sleep-and-alzheimers' },
      { label: 'NIH — How Sleep Clears the Brain', url: 'https://newsinhealth.nih.gov/2013/11/sleep-your-brain' },
      { label: 'CDC — Sleep Hygiene Tips', url: 'https://www.cdc.gov/sleep/about_sleep/sleep_hygiene.html' },
    ],
  },
  {
    cat: 'BMI & DIET',
    icon: '⚖️',
    title: 'Weight, Diet and Brain Risk',
    body: 'Maintaining a healthy BMI and following a brain-healthy diet are among the strongest modifiable risk factors for dementia.',
    links: [
      { label: "Alzheimer's Society — BMI & Dementia Risk", url: 'https://www.alzheimers.org.uk/about-dementia/managing-the-risk-of-dementia/reduce-your-risk-of-dementia/obesity' },
      { label: 'Harvard — Mediterranean Diet & Brain Health', url: 'https://www.health.harvard.edu/mind-and-mood/the-mind-diet' },
    ],
  },
  {
    cat: 'FAMILY HISTORY',
    icon: '👪',
    title: 'Genetics Is Not Destiny',
    body: 'Having a family history raises risk but does not determine outcome. Up to 45% of dementia cases are preventable through lifestyle.',
    links: [
      { label: "Alzheimer's Association — Genetics & Risk", url: 'https://www.alz.org/alzheimers-dementia/what-is-alzheimers/causes-and-risk-factors/genetics' },
      { label: 'Lancet 2024 — 45% Dementia Is Preventable', url: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(24)01296-0/fulltext' },
    ],
  },
  {
    cat: 'AGE & MIDLIFE',
    icon: '🧠',
    title: 'Why Midlife Is the Critical Window',
    body: "Changes that lead to Alzheimer's begin decades before symptoms. Taking action in your 40s and 50s has the greatest impact.",
    links: [
      { label: "Early Detection — Alzheimer's Association", url: 'https://www.alz.org/alzheimers-dementia/diagnosis/early-detection' },
      { label: 'Brain Health in Midlife — CDC', url: 'https://www.cdc.gov/aging/data/dementia.htm' },
    ],
  },
];

function impactLabel(val) {
  const abs = Math.abs(val);
  if (abs >= 10) return { text: 'High Impact', color: '#D9694F', icon: '⚠️' };
  if (abs >= 5)  return { text: 'Moderate Impact', color: '#E9A94A', icon: '⚠️' };
  return { text: 'Low Impact', color: '#7EC49A', icon: '✅' };
}

export default function ReportScreen({ navigation }) {
  const {
    predictionResult,
    heightFt, heightIn, heightCm, weight, unit,
  } = useOnboarding();
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [sugOpen,    setSugOpen]    = useState(false);
  const [sugIdx,     setSugIdx]     = useState(0);
  const [showResearchDetails, setShowResearchDetails] = useState(false);
  const caregiverRequestCount = useCaregiverRequestCount();

  const score      = predictionResult?.prediction ?? 0;
  const similarityLabel = score >= 60 ? 'Higher Similarity' : score >= 30 ? 'Moderate Similarity' : 'Lower Similarity';
  const riskColor  = score >= 60 ? '#D9694F' : score >= 30 ? '#E9A94A' : '#7EC49A';
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
  const bmi        = predictionResult?.bmi ?? localBmi;
  const baseline   = predictionResult?.baseline ?? null;
  const factors    = predictionResult?.factor_contributions ?? null;
  useFocusEffect(
    useCallback(() => {
      scoreAnim.setValue(0);
      Animated.timing(scoreAnim, { toValue: score, duration: 1500, useNativeDriver: false }).start();
      log.debug('ReportScreen focused', { score, similarityLabel });
      return () => scoreAnim.stopAnimation();
    }, [score, similarityLabel])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    scoreAnim.setValue(0);
    setTimeout(() => {
      setRefreshing(false);
      Animated.timing(scoreAnim, { toValue: score, duration: 1500, useNativeDriver: false }).start();
    }, 600);
  }, [score]);

  function openLink(url) {
    Linking.openURL(url).catch(() => log.warn('ReportScreen: could not open URL', url));
  }

  const CIRC = 2 * Math.PI * 36;
  const dashOffset = scoreAnim.interpolate({ inputRange: [0, 100], outputRange: [-CIRC, 0] });
  const sug = SUGGESTIONS[sugIdx];

  const FACTOR_KEYS = [
    { key: 'chronotype', label: 'Chronotype' },
    { key: 'age',        label: 'Age' },
    { key: 'sleep_time', label: 'Sleeptime' },
    { key: 'bmi',        label: 'BMI' },
    { key: 'wake_time',  label: 'Waketime' },
    { key: 'ethnicity',  label: 'Ethnicity' },
  ];

  const bmiStatus = (() => {
    if (bmi == null) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: '#3498db' };
    if (bmi < 25) return { label: 'Healthy Weight', color: '#7EC49A' };
    if (bmi < 30) return { label: 'Overweight', color: '#E9A94A' };
    return { label: 'Obese', color: '#D9694F' };
  })();

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <SafeAreaView style={styles.safeBottom}>
        <View style={styles.root}>
          <LinearGradient colors={['#FDF6F0', '#FDF6F0']} style={StyleSheet.absoluteFillObject} />

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F0955A" colors={['#F0955A']} progressBackgroundColor="#FFFFFF" />
            }
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.appTitle}>ADChronotype</Text>
            </View>

            <TouchableOpacity
              style={styles.headerCognitiveBtn}
              onPress={() => navigation.navigate('CognitiveTest')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="brain" size={17} color="#E07B3C" />
              <Text style={styles.cognitiveBtnText}>Take Cognitive Test</Text>
            </TouchableOpacity>

            {/* Main content — two column layout matching image 4 */}
            <View style={styles.mainRow}>

              {/* LEFT — Score */}
              <View style={styles.leftCol}>
                <Text style={styles.colTitle}>Score</Text>
                <Text style={styles.scoreLabel}>Cognitive Similarity Score</Text>

                <View style={styles.ringWrap}>
                  <Svg width={100} height={100} viewBox="0 0 100 100">
                    <Circle cx="50" cy="50" r="44" stroke="#F0E2D4" strokeWidth="8" fill="transparent" />
                    <AnimatedCircle
                      cx="50" cy="50" r="44"
                      stroke={riskColor}
                      strokeWidth="8" fill="transparent"
                      strokeDasharray={2 * Math.PI * 44}
                      strokeDashoffset={scoreAnim.interpolate({ inputRange: [0, 100], outputRange: [-(2 * Math.PI * 44), 0] })}
                      strokeLinecap="round"
                      rotation="-90" origin="50,50"
                    />
                  </Svg>
                  <View style={styles.ringCenter}>
                    <Text style={[styles.scoreNum, { color: riskColor }]}>{score}%</Text>
                  </View>
                </View>

                <View style={[styles.riskBadge, { borderColor: riskColor }]}>
                  <Text style={styles.riskIcon}>{score >= 60 ? '⚠️' : score >= 30 ? '⚠️' : '✅'}</Text>
                  <Text style={[styles.riskText, { color: riskColor }]}>{similarityLabel}</Text>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                  <Text style={styles.disclaimerTitle}>IMPORTANT — NOT A CLINICAL DIAGNOSIS</Text>
                  <Text style={styles.disclaimerBody}>{RESEARCH_DISCLAIMER_SHORT}</Text>
                  <TouchableOpacity
                    style={styles.researchToggle}
                    onPress={() => setShowResearchDetails(true)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.researchToggleText}>
                      View full disclaimer and research sources
                    </Text>
                    <Feather name="info" size={12} color="#E07B3C" />
                  </TouchableOpacity>
                </View>

                {/* BMI */}
                {bmiStatus && (
                  <View style={[styles.bmiCard, { borderColor: bmiStatus.color }]}>
                    <Text style={[styles.bmiText, { color: bmiStatus.color }]}>
                      Current BMI: {bmi.toFixed(1)} — {bmiStatus.label}
                    </Text>
                  </View>
                )}

                {/* View Tips button */}
                <TouchableOpacity
                  style={styles.tipsBtn}
                  onPress={() => navigation.navigate('Tips')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.tipsBtnText}>View Tips</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => navigation.navigate('DoctorReport')}
                  activeOpacity={0.85}
                >
                  <Feather name="file-text" size={14} color="#E07B3C" />
                  <Text style={styles.reportBtnText}>Doctor Report</Text>
                </TouchableOpacity>
              </View>

              {/* RIGHT — Factor Contribution */}
              <View style={styles.rightCol}>
                <Text style={styles.colTitle}>Factor Contribution</Text>
                {baseline != null && (
                  <Text style={styles.baselineText}>Baseline: {baseline}% — shifted by factors below</Text>
                )}

                {factors ? (
                  <View style={styles.factorGrid}>
                    {FACTOR_KEYS.map(({ key, label }) => {
                      const val = factors[key];
                      if (val === undefined || val === null) return null;
                      const impact = impactLabel(val);
                      const sign = val > 0 ? '+' : '';
                      return (
                        <View key={key} style={styles.factorCell}>
                          <Text style={styles.factorLabel}>{label}</Text>
                          <Text style={[styles.factorVal, { color: impact.color }]}>{sign}{val.toFixed(1)}%</Text>
                          <View style={[styles.impactBadge, { backgroundColor: impact.color + '22' }]}>
                            <Text style={styles.impactIcon}>{impact.icon}</Text>
                            <Text style={[styles.impactText, { color: impact.color }]}>{impact.text}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.factorPlaceholder}>
                    <Text style={styles.factorPlaceholderText}>
                      Factor contribution information is unavailable for this result.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom nav — Home | Sleep | Tips | Profile */}
          <View style={styles.navWrap}>
            <View style={styles.nav}>
              {[
                { label: 'Home',    icon: 'home',      active: true,  onPress: null },
                { label: 'Sleep',   icon: 'moon',      active: false, onPress: () => navigation.navigate('SleepLog') },
                { label: 'Tips',    icon: 'book-open', active: false, onPress: () => navigation.navigate('Tips') },
                { label: 'Caregiver', icon: 'users',   active: false, onPress: () => navigation.navigate('Caregiver'), badgeCount: caregiverRequestCount },
                { label: 'Profile', icon: 'user',      active: false, onPress: () => navigation.navigate('Profile') },
              ].map(t => (
                <TouchableOpacity
                  key={t.label}
                  style={styles.navItem}
                  onPress={t.onPress}
                  disabled={t.active}
                  activeOpacity={0.7}
                >
                  {t.badgeCount > 0 && (
                    <View style={styles.navBadge}>
                      <Text style={styles.navBadgeText}>{t.badgeCount > 9 ? '9+' : t.badgeCount}</Text>
                    </View>
                  )}
                  <Feather name={t.icon} size={22} color={t.active ? '#F0955A' : '#8A6A4E'} />
                  <Text style={[styles.navLabel, t.active && { color: '#F0955A' }]}>{t.label}</Text>
                  {t.active && <View style={styles.activeDot} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={showResearchDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResearchDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.researchModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About Your Research Score</Text>
              <TouchableOpacity onPress={() => setShowResearchDetails(false)} accessibilityLabel="Close">
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
                <TouchableOpacity key={source.label} onPress={() => openLink(source.url)} style={styles.modalLinkRow}>
                  <Text style={styles.modalLink}>{source.label} — View published research</Text>
                  <Feather name="external-link" size={13} color="#E07B3C" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowResearchDetails(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeTop:    { flex: 0, backgroundColor: '#FDF6F0', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#FDF6F0' },
  root:       { flex: 1 },
  scroll:     { flex: 1, paddingHorizontal: 16 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 20 },
  appTitle:   { color: '#3D2B1F', fontSize: 22, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  headerCognitiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E07B3C77', borderRadius: 12, paddingVertical: 13, marginBottom: 18 },

  mainRow:    { flexDirection: 'row', gap: 14 },

  leftCol:    { flex: 1 },
  rightCol:   { flex: 1 },
  colTitle:   { color: '#3D2B1F', fontSize: 16, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginBottom: 6 },

  scoreLabel: { color: '#8A6A4E', fontSize: 11, marginBottom: 14 },
  ringWrap:   { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreNum:   { fontSize: 22, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },

  riskBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 14 },
  riskIcon:   { fontSize: 12 },
  riskText:   { fontSize: 12, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },

  disclaimer:      { backgroundColor: '#FBEED2', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F0D9A8' },
  disclaimerTitle: { color: '#9A3412', fontSize: 11, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', marginBottom: 6 },
  disclaimerBody:  { color: '#7C4A1E', fontSize: 10, lineHeight: 15 },
  researchToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 7, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F0D9A8' },
  researchToggleText: { color: '#E07B3C', fontSize: 9, lineHeight: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  researchModal: { width: '100%', maxWidth: 520, maxHeight: '82%', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E07B3C66', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  modalTitle: { color: '#3D2B1F', fontSize: 18, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', flex: 1 },
  modalScroll: { flexGrow: 0 },
  modalSectionTitle: { color: '#3D2B1F', fontSize: 13, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginTop: 10, marginBottom: 5 },
  modalBody: { color: '#8A6A4E', fontSize: 12, lineHeight: 19 },
  modalLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 7 },
  modalLink: { color: '#E07B3C', fontSize: 12, lineHeight: 17, textDecorationLine: 'underline', flex: 1 },
  modalCloseButton: { backgroundColor: '#E07B3C', borderRadius: 10, alignItems: 'center', paddingVertical: 11, marginTop: 14 },
  modalCloseText: { color: '#fff', fontSize: 14, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },

  bmiCard:    { borderWidth: 1.5, borderRadius: 10, padding: 10, marginBottom: 12 },
  bmiText:    { fontSize: 12, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', textAlign: 'center' },

  tipsBtn:    { backgroundColor: '#E07B3C', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  tipsBtnText:{ color: '#fff', fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  reportBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E07B3C55', paddingVertical: 11, marginTop: 10 },
  reportBtnText:{ color: '#E07B3C', fontSize: 12, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  cognitiveBtnText: { color: '#E07B3C', fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },

  baselineText: { color: '#8A6A4E', fontSize: 10, marginBottom: 12, lineHeight: 15 },
  factorGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  factorCell:   { width: '47%', gap: 2, minHeight: 84 },
  factorLabel:  { color: '#8A6A4E', fontSize: 11, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },
  factorVal:    { fontSize: 18, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  impactBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2 },
  impactIcon:   { fontSize: 10 },
  impactText:   { fontSize: 10, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },

  factorPlaceholder:     { padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F0E2D4' },
  factorPlaceholderText: { color: '#B09A86', fontSize: 11, lineHeight: 17 },

  // suggestion bubble
  sugWrap:      { position: 'absolute', bottom: 70, right: 14, zIndex: 100, alignItems: 'flex-end' },
  sugDot:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E07B3C', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#E07B3C', shadowOpacity: 0.7, shadowRadius: 8 },
  sugBadge:     { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#D9694F', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FDF6F0' },
  sugBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  sugPanel:     { position: 'absolute', bottom: 56, right: 0, width: 255, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E07B3C55', borderRadius: 16, borderBottomRightRadius: 4, padding: 14 },
  sugClose:     { position: 'absolute', top: -12, left: -12, width: 28, height: 28, borderRadius: 14, backgroundColor: '#D9694F', borderWidth: 2, borderColor: '#FDF6F0', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  sugCloseText: { color: '#fff', fontSize: 13, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', lineHeight: 16 },
  sugTag:       { backgroundColor: '#E07B3C33', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 7 },
  sugTagText:   { color: '#E07B3C', fontSize: 10, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', letterSpacing: 0.4 },
  sugTitle:     { color: '#3D2B1F', fontSize: 12, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', marginBottom: 5, lineHeight: 17 },
  sugBody:      { color: '#8A6A4E', fontSize: 10, lineHeight: 15, marginBottom: 9 },
  linkList:     { marginBottom: 10, gap: 7 },
  linkRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  linkText:     { color: '#E07B3C', fontSize: 10, lineHeight: 14, flex: 1, textDecorationLine: 'underline' },
  sugNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0E2D4', paddingTop: 8 },
  sugCount:     { color: '#555', fontSize: 9 },
  sugArrow:     { width: 26, height: 26, borderRadius: 7, backgroundColor: '#FDF6F0', borderWidth: 1, borderColor: '#F0E2D4', alignItems: 'center', justifyContent: 'center' },
  sugArrowText: { color: '#888', fontSize: 14, lineHeight: 18 },

  // bottom nav
  navWrap:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FDF6F0', borderTopWidth: 1, borderTopColor: '#F0E2D4' },
  nav:       { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  navItem:   { alignItems: 'center', width: 64 },
  navBadge: { position: 'absolute', top: -5, right: 13, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#D9694F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 2 },
  navBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  navLabel:  { color: '#8A6A4E', fontSize: 10, marginTop: 4, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },
  navLabelDisabled: { color: '#D1D5DB' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#F0955A', position: 'absolute', bottom: -8 },
});
