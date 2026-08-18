import React, { useState } from 'react';
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
    body: 'When you create an account and use ADC, we collect your email address; chronotype and lifestyle questionnaire responses, including sleep and wake times, age, weight, height, and ethnicity; family history of Alzheimer\'s disease that you voluntarily provide; and cognitive test results only if you actively opt in. We do not collect this data through hidden tracking. Everything above is information you directly enter into the app.',
  },
  {
    title: '3. How We Use Your Information',
    body: 'We use your information to calculate and show your personal chronotype result, operate and maintain your account, fix bugs, and improve app performance. If you opt in to cognitive testing, your cognitive scores together with lifestyle and chronotype factors are used to improve our research dataset and train the model underlying ADC. When used for the dataset or model training, this data is never linked back to your identity or account. We do not use your data for advertising, and we do not sell your personal information.',
  },
  {
    title: '4. Not Medical Advice',
    body: 'ADC is a research and educational tool. It does not diagnose Alzheimer\'s disease or any other medical condition, and it is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider with any questions about your health.',
  },
  {
    title: '5. How We Store and Protect Your Data',
    body: 'Your account and assessment data are stored in a secure backend database that we control. We take reasonable technical and organizational measures to protect your information, but no method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.',
  },
  {
    title: '6. Data Sharing',
    body: 'We do not sell your personal information. We may share data with service providers that host our cloud infrastructure and database solely to operate the app, or with authorities when required to comply with a legal obligation, protect our rights, or ensure user safety. If cognitive-test and lifestyle data is ever used in aggregate research findings or publications, it will be de-identified and not linked back to you individually.',
  },
  {
    title: '7. Your Choices and Rights',
    body: 'Cognitive testing is optional, and you can use the core chronotype assessment without taking cognitive tests. You can contact us to review or correct information tied to your account. You can delete your account and associated data directly in the app or email adchronotype.study@gmail.com for help; we will delete your data except where retention is required by law. Residents of California, the EU/UK, or other regions with specific data-protection laws may have additional rights, including data portability or objecting to processing. Contact us and we will do our best to accommodate your request.',
  },
  {
    title: '8. Children\'s Privacy',
    body: 'ADC does not set a maximum age limit, and our research dataset and model are built around adults aged 40–60, so results are most meaningful within that range. U.S. law (COPPA) requires special protections for anyone under 13, so ADC is not directed at and does not knowingly collect personal information from children under 13. If you believe a child under 13 created an account or provided personal information, contact us and we will delete it.',
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

export default function PrivacyPolicyScreen({ navigation, route }) {
  const canGoBack = navigation?.canGoBack?.();
  const consentFlow = route?.params?.consentFlow === true;
  const [reachedBottom, setReachedBottom] = useState(false);

  function handleScroll({ nativeEvent }) {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (distFromBottom < 40) setReachedBottom(true);
  }

  function handleAccept() {
    navigation.reset({
      index: 0,
      routes: [{
        name: 'Splash',
        params: {
          termsAccepted: route?.params?.termsAccepted === true,
          privacyAccepted: true,
        },
      }],
    });
  }

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

        {consentFlow && !reachedBottom && (
          <View style={styles.scrollHint}>
            <Text style={styles.scrollHintText}>↓ Scroll to the bottom to accept</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={consentFlow}
          onScroll={consentFlow ? handleScroll : undefined}
          scrollEventThrottle={100}
        >
          <Text style={styles.updated}>ADC (AD Chronotype) • Last updated: August 16, 2026</Text>

          <View style={styles.notice}>
            <Feather name="shield" size={20} color="#8b5cf6" />
            <Text style={styles.noticeText}>
              ADC is a research-oriented app that estimates your chronotype and explores its relationship to lifestyle and cognitive factors associated with Alzheimer's disease risk. ADC is developed and operated by an independent developer, not a registered company. This policy explains what information we collect, how we use it, and the choices you have.
            </Text>
          </View>

          {SECTIONS.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>

        {consentFlow && (
          <View style={styles.footer}>
            {!reachedBottom && (
              <Text style={styles.footerHint}>Please read the Privacy Policy before accepting</Text>
            )}
            <TouchableOpacity
              style={[styles.acceptBtn, !reachedBottom && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={!reachedBottom}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptBtnText}>
                {reachedBottom ? 'I Accept — Return to Get Started →' : 'Scroll to the bottom to accept'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  scrollHint: { alignItems: 'center', backgroundColor: '#7c3aed22', borderBottomColor: '#7c3aed33', borderBottomWidth: 1, paddingVertical: 7 },
  scrollHintText: { color: '#7c3aed', fontSize: 11, fontWeight: '600' },
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
  footer: { backgroundColor: '#05082a', borderTopColor: '#1a1a40', borderTopWidth: 1, padding: 16 },
  footerHint: { color: '#4a5270', fontSize: 11, marginBottom: 8, textAlign: 'center' },
  acceptBtn: { alignItems: 'center', backgroundColor: '#7c3aed', borderRadius: 14, height: 52, justifyContent: 'center' },
  acceptBtnDisabled: { backgroundColor: '#2a1a60', opacity: 0.6 },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
