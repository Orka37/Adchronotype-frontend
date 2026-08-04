import React from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'ADChronotype collects account information such as name, username, and email address. The app also collects information users enter for the questionnaire, including chronotype, sleep and wake times, age, sex, height, weight, ethnicity, and family history. Sleep logs, cognitive test results, prediction results, factor contributions, caregiver connections, and app interaction records may also be stored.',
  },
  {
    title: 'How We Use Information',
    body: 'We use this information to create and manage user accounts, generate cognitive similarity scores, show factor contributions, store sleep and cognitive test history, support caregiver connection features, provide password reset, improve app reliability, and support research and awareness goals.',
  },
  {
    title: 'Health And Sensitive Information',
    body: 'Some information entered in ADChronotype may be health-related or sensitive, including sleep patterns, cognitive test results, ethnicity, sex, family history, and generated similarity scores. This information is used for app functionality and research-related analysis. ADChronotype is not a medical device and does not provide a clinical diagnosis.',
  },
  {
    title: 'Caregiver Connections',
    body: 'If users enable caregiver search and accept a connection request, connected users may be able to view selected app information such as score, factor contributions, and cognitive test results. Users can control whether they appear in caregiver search.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell personal data. We do not use personal data for third-party advertising or tracking. Data may be processed by service providers needed to operate the app, such as hosting, database, authentication, and email delivery providers.',
  },
  {
    title: 'Data Security',
    body: 'We use authenticated backend APIs, secure password hashing, password reset tokens, and hosted database services to protect user information. No online service can guarantee absolute security, but we take reasonable steps to protect the data used by the app.',
  },
  {
    title: 'Data Retention',
    body: 'We keep account, questionnaire, prediction, sleep log, cognitive test, and caregiver connection records for as long as needed to provide the app experience, maintain user history, support research goals, or comply with legal and operational requirements.',
  },
  {
    title: 'Children',
    body: 'ADChronotype is intended for users aged 18 and older. The app is not intended for children.',
  },
  {
    title: 'Your Choices',
    body: 'Users may update profile information, reset passwords, control caregiver search visibility, disconnect caregiver relationships where available, and contact the ADChronotype team for account or data questions.',
  },
  {
    title: 'Contact',
    body: 'For privacy questions, contact the ADChronotype team at support@adchronotype.com.',
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
  const canGoBack = navigation?.canGoBack?.();

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <View style={styles.root}>
        <LinearGradient colors={['#05082a', '#0a0d3a']} style={StyleSheet.absoluteFillObject} />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (canGoBack ? navigation.goBack() : navigation.navigate('Login'))}
            activeOpacity={0.8}
          >
            <Feather name="chevron-left" size={26} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.updated}>Last updated: August 2026</Text>

          <View style={styles.notice}>
            <Feather name="shield" size={20} color="#8b5cf6" />
            <Text style={styles.noticeText}>
              This policy explains how ADChronotype handles information used to operate the app.
            </Text>
          </View>

          {SECTIONS.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 0, backgroundColor: '#05082a', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  root: { flex: 1, backgroundColor: '#05082a' },
  header: {
    alignItems: 'center',
    borderBottomColor: '#1f254f',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 40 },
  content: { padding: 20, paddingBottom: 44 },
  updated: { color: '#6f759b', fontSize: 12, marginBottom: 16 },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderColor: '#7c3aed55',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    padding: 14,
  },
  noticeText: { color: '#c7c8df', flex: 1, fontSize: 14, lineHeight: 21 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  sectionBody: { color: '#a5aacd', fontSize: 14, lineHeight: 22 },
});
