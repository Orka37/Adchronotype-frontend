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
    title: '1. Who We Are',
    body: 'ADC is a solo-developed app. If you have questions about this policy or your data, you can reach the developer directly at adchronotype.study@gmail.com.',
  },
  {
    title: '2. Information We Collect',
    body: 'When you create an account and use ADC, we collect account information, chronotype and lifestyle data, family health history, and optional cognitive test data. We do not collect this data through hidden tracking. Everything above is information you directly enter into the app.',
  },
  {
    title: '3. How We Use Your Information',
    body: 'We use your information to calculate and show your chronotype result, operate your account, maintain the app, and improve reliability. If you opt in to cognitive testing, your cognitive scores together with lifestyle and chronotype factors may be used to improve our research dataset and train the model. This research use is never linked back to your identity or account.',
  },
  {
    title: '4. Not Medical Advice',
    body: 'ADC is a research and educational tool. It does not diagnose Alzheimer\'s disease or any other medical condition, and it is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider with any questions about your health.',
  },
  {
    title: '5. How We Store and Protect Your Data',
    body: 'Your account and assessment data are stored in a secure backend database that we control. We take reasonable technical and organizational measures to protect your information, but no electronic storage or transmission method is 100% secure.',
  },
  {
    title: '6. Data Sharing',
    body: 'We do not sell your personal information. We may share data with service providers who host our infrastructure only to operate the app, or with authorities if required by law. If cognitive-test and lifestyle data is ever used in aggregate research findings, it will be de-identified and not linked back to you individually.',
  },
  {
    title: '7. Your Choices and Rights',
    body: 'Cognitive testing is optional. You can use the core chronotype assessment without taking cognitive tests. You can contact us to review or correct account information, and you can delete your account and associated data directly in the app or by emailing adchronotype.study@gmail.com.',
  },
  {
    title: '8. Children\'s Privacy',
    body: 'ADC does not set a maximum age limit, and our research dataset and model are built around adults aged 40-60, so results are most meaningful within that range. ADC is not directed at and does not knowingly collect information from children under 13.',
  },
  {
    title: '9. Data Retention',
    body: 'We retain your account and assessment data for as long as your account is active, or as needed to provide the app and support the research described above. You can delete your account and data at any time using the delete account button in the app, or by contacting us.',
  },
  {
    title: '10. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time as the app evolves. We will update the Last updated date when we do. Continued use of the app after changes means you accept the updated policy.',
  },
  {
    title: '11. Contact Us',
    body: 'Questions about this Privacy Policy or your data? Email adchronotype.study@gmail.com.',
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
          <Text style={styles.updated}>ADC (AD Chronotype) • Last updated: August 16, 2026</Text>

          <View style={styles.notice}>
            <Feather name="shield" size={20} color="#8b5cf6" />
            <Text style={styles.noticeText}>
              ADC is a research-oriented app that estimates your chronotype and explores its relationship to lifestyle and cognitive factors associated with Alzheimer's disease risk.
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
