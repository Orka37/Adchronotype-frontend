import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { log } from '../utils/logger';

const TERMS = [
  {
    heading: '1. What ADC Is',
    body: 'ADC estimates your chronotype based on a questionnaire, including sleep and wake times, age, weight, height, ethnicity, and family history of Alzheimer\'s disease, and if you opt in, cognitive test results. It is a research and educational tool exploring the relationship between chronotype, lifestyle factors, and Alzheimer\'s disease risk factors.',
  },
  {
    heading: '2. Not Medical Advice',
    body: 'ADC does not provide medical advice, diagnosis, or treatment, and is not a substitute for care from a qualified healthcare provider. Nothing in the app, including your chronotype result, any risk-factor insight, or cognitive test outcome, should be treated as a medical diagnosis.',
  },
  {
    heading: '3. Eligibility',
    body: 'ADC does not set a maximum age limit or require a specific age to sign up, beyond standard protections for children. Our research dataset and underlying model are built around adults aged 40-60, so chronotype and risk-factor results are most meaningful within that range.',
  },
  {
    heading: '4. Your Account',
    body: 'To use ADC, you create an account with your email address. You are responsible for keeping your account credentials secure and for all activity under your account. You can delete your account at any time using the delete account button in the app.',
  },
  {
    heading: '5. Voluntary Research Participation',
    body: 'The core chronotype assessment is available to all users. Cognitive testing is entirely optional. If you choose to take the cognitive tests, you agree that your cognitive results, together with your lifestyle and chronotype data, may be used to improve our research dataset and train the model behind ADC.',
  },
  {
    heading: '6. Acceptable Use',
    body: 'You agree not to provide false information with the intent to corrupt the research dataset, access another user\'s account or data without authorization, reverse-engineer, scrape, or misuse the app or its model, or use the app for any unlawful purpose.',
  },
  {
    heading: '7. Intellectual Property',
    body: 'The app, including its design, questionnaire, underlying model, and content, is owned by the developer. You retain ownership of the personal data you submit, but you grant us a license to use it as described in these Terms and our Privacy Policy.',
  },
  {
    heading: '8. Disclaimer of Warranties',
    body: 'ADC is provided "as is" and "as available," without warranties of any kind, express or implied. We do not guarantee that the app will be uninterrupted, error-free, or that any chronotype or risk-factor result will be accurate or complete. This is an evolving research tool, not a certified medical device.',
  },
  {
    heading: '9. Limitation of Liability',
    body: 'To the fullest extent permitted by law, the developer is not liable for any indirect, incidental, or consequential damages arising from your use of the app, including decisions made based on your chronotype result or cognitive test outcome.',
  },
  {
    heading: '10. Termination',
    body: 'You may stop using the app and delete your account at any time using the in-app delete account button. We may suspend or terminate accounts that violate these Terms.',
  },
  {
    heading: '11. Changes to These Terms',
    body: 'We may update these Terms as the app evolves. We will update the Last updated date when we do. Continuing to use the app after changes means you accept the updated Terms.',
  },
  {
    heading: '12. Governing Law',
    body: 'ADC is not operated by a registered business, so these Terms do not designate a specific court or company jurisdiction. If a dispute ever needs to be resolved formally, it will be governed by the laws applicable in your country or state of residence.',
  },
  {
    heading: '13. Contact',
    body: 'Questions about these Terms? Email adchronotype.study@gmail.com.',
  },
];

export default function TermsScreen({ navigation, route }) {
  const [reachedBottom, setReachedBottom] = useState(false);
  const scrollRef = useRef(null);

  function handleScroll({ nativeEvent }) {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (distFromBottom < 40) setReachedBottom(true);
  }

  function handleAccept() {
    log.info('TermsScreen: user accepted T&C');
    // Pass accepted=true back to SplashScreen via navigation param
    navigation.navigate('Splash', { accepted: true });
  }

  function openPrivacyPolicy() {
    navigation.navigate('PrivacyPolicy');
  }

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <SafeAreaView style={styles.safeBottom}>
        <View style={styles.root}>
          <LinearGradient colors={['#05082a', '#0a0d3a']} style={StyleSheet.absoluteFillObject} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="chevron-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Terms of Service</Text>
            <View style={{ width: 32 }} />
          </View>

          {!reachedBottom && (
            <View style={styles.scrollHint}>
              <Text style={styles.scrollHintText}>↓ Scroll to the bottom to accept</Text>
            </View>
          )}

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.lastUpdated}>ADC (AD Chronotype) • Last updated: August 16, 2026</Text>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                ⚠️  ADC is a <Text style={styles.bold}>research and educational tool only</Text> — not a medical diagnostic tool.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.policyLinkCard}
              onPress={openPrivacyPolicy}
              activeOpacity={0.85}
            >
              <Feather name="shield" size={18} color="#a78bfa" />
              <View style={styles.policyLinkTextWrap}>
                <Text style={styles.policyLinkTitle}>Privacy Policy</Text>
                <Text style={styles.policyLinkBody}>
                  See how your information is collected, stored, and used.
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#8c91b5" />
            </TouchableOpacity>

            {TERMS.map((section, i) => (
              <View key={i} style={styles.section}>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Accept button — only active after scrolling to bottom */}
          <View style={styles.footer}>
            {!reachedBottom && (
              <Text style={styles.footerHint}>Please read all terms before accepting</Text>
            )}
            <TouchableOpacity
              style={[styles.acceptBtn, !reachedBottom && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={!reachedBottom}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptBtnText}>
                {reachedBottom ? 'I Accept — Get Started →' : 'Scroll to the bottom to accept'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeTop:    { flex: 0, backgroundColor: '#05082a', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#05082a' },
  root:       { flex: 1 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a40' },
  backBtn:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  scrollHint:     { backgroundColor: '#7c3aed22', paddingVertical: 7, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#7c3aed33' },
  scrollHintText: { color: '#7c3aed', fontSize: 11, fontWeight: '600' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 20 },
  lastUpdated:   { color: '#4a5270', fontSize: 11, marginBottom: 16 },

  disclaimerBox:  { backgroundColor: 'rgba(10,8,40,0.9)', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1.5, borderColor: '#ffb83066' },
  disclaimerText: { color: '#c0c0d0', fontSize: 13, lineHeight: 20 },
  bold:           { color: '#ffb830', fontWeight: '800' },

  policyLinkCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 14, padding: 14, marginBottom: 22, borderWidth: 1, borderColor: '#7c3aed66' },
  policyLinkTextWrap: { flex: 1 },
  policyLinkTitle:    { color: '#ffffff', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  policyLinkBody:     { color: '#8c91b5', fontSize: 12, lineHeight: 18 },

  section:         { marginBottom: 22 },
  sectionHeading:  { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  sectionBody:     { color: '#8c91b5', fontSize: 13, lineHeight: 21 },

  footer:           { padding: 16, borderTopWidth: 1, borderTopColor: '#1a1a40', backgroundColor: '#05082a' },
  footerHint:       { color: '#4a5270', fontSize: 11, textAlign: 'center', marginBottom: 8 },
  acceptBtn:        { backgroundColor: '#7c3aed', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  acceptBtnDisabled:{ backgroundColor: '#2a1a60', opacity: 0.6 },
  acceptBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
});
