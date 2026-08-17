import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useOnboarding } from '../context/OnboardingContext';

const INFO_SECTIONS = [
  {
    icon: 'info',
    title: 'About ADChronotype',
    body: 'ADChronotype is a research and awareness app that helps users understand how sleep timing, chronotype, and selected health factors relate to cognitive health patterns.',
  },
  {
    icon: 'activity',
    title: 'Research Purpose',
    body: 'The app collects questionnaire answers, sleep logs, and cognitive test results to support exploratory research and improve statistical prediction models over time.',
  },
  {
    icon: 'alert-triangle',
    title: 'Not a Clinical Diagnosis',
    body: 'ADChronotype is not a medical device and does not diagnose Alzheimer’s disease, dementia, or any other health condition. Users should speak with a licensed clinician for medical concerns.',
  },
  {
    icon: 'database',
    title: 'How Data Is Used',
    body: 'Your information is used to generate app results, store your history, and support aggregate research analysis. The app should avoid exposing personal health information in public or shared views.',
  },
  {
    icon: 'shield',
    title: 'Privacy & Security',
    body: 'Authentication uses secure tokens, password reset links expire, and protected data is sent through authenticated backend APIs. Keep your password private and log out on shared devices.',
  },
  {
    icon: 'mail',
    title: 'Support',
    body: 'For account help, password issues, or study questions, contact the project team through the support channel provided by the ADChronotype team.',
  },
];

export default function ProjectInfoScreen({ navigation }) {
  const { hasCompletedPrediction } = useOnboarding();

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <View style={styles.root}>
        <LinearGradient colors={['#030827', '#030A31']} style={StyleSheet.absoluteFillObject} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Feather name="chevron-left" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Info</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="brain" size={34} color="#c8b8ff" />
          </View>
          <Text style={styles.title}>ADChronotype</Text>
          <Text style={styles.subtitle}>
            A sleep chronotype and cognitive health research tool.
          </Text>

          <View style={styles.noticeCard}>
            <Feather name="alert-triangle" size={18} color="#ffb830" />
            <Text style={styles.noticeText}>
              This app is for research and awareness only. It is not a clinical diagnosis.
            </Text>
          </View>

          {INFO_SECTIONS.map((item) => (
            <View key={item.title} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Feather name={item.icon} size={18} color="#8a52f3" />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
          ))}

          {!hasCompletedPrediction && (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => navigation.navigate('Welcome')}
              activeOpacity={0.85}
            >
              <Text style={styles.startBtnText}>Get Started</Text>
              <Feather name="arrow-right" size={18} color="#ffffff" />
            </TouchableOpacity>
          )}

          <View style={styles.versionCard}>
            <Text style={styles.versionLabel}>Version</Text>
            <Text style={styles.versionValue}>ADChronotype v1.0.0</Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  root: { flex: 1, backgroundColor: '#030A31' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f254f',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 40 },
  scroll: { padding: 20, paddingBottom: 42 },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#7c3aed22',
    borderWidth: 1,
    borderColor: '#7c3aed44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  subtitle: { color: '#8c91b5', fontSize: 15, lineHeight: 23, marginBottom: 18 },
  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#1f1a10',
    borderWidth: 1,
    borderColor: '#ffb83066',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  noticeText: { flex: 1, color: '#f8e7a6', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  card: {
    backgroundColor: '#101538',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f254f',
    padding: 15,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#7c3aed22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '800' },
  cardBody: { color: '#9aa0c5', fontSize: 13, lineHeight: 21 },
  startBtn: {
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  versionCard: {
    backgroundColor: '#0d1030',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f254f',
    padding: 15,
    marginTop: 4,
  },
  versionLabel: { color: '#4a5270', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  versionValue: { color: '#c8b8ff', fontSize: 14, fontWeight: '800' },
});
