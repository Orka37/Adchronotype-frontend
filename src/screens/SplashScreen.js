import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Line, G } from 'react-native-svg';
import { log } from '../utils/logger';
import { recordPreAuthLegalConsent } from '../utils/legalConsent';

function BrainIllustration() {
  return (
    <Svg width={260} height={260} viewBox="0 0 260 260">
      <Circle cx="130" cy="130" r="110" fill="#F4C9A8" opacity="0.6" />
      <Circle cx="130" cy="130" r="90" fill="#F6D8BE" opacity="0.4" />
      <G stroke="#B76334" strokeWidth="1.5" opacity="0.7">
        <Line x1="20" y1="80"  x2="60"  y2="110" />
        <Line x1="20" y1="80"  x2="30"  y2="55"  />
        <Line x1="30" y1="55"  x2="50"  y2="40"  />
        <Line x1="60" y1="110" x2="45"  y2="130" />
        <Line x1="45" y1="130" x2="25"  y2="145" />
        <Line x1="45" y1="130" x2="55"  y2="155" />
        <Circle cx="20" cy="80"  r="4" fill="#E07B3C" />
        <Circle cx="30" cy="55"  r="3" fill="#C96F37" />
        <Circle cx="25" cy="145" r="4" fill="#E07B3C" />
      </G>
      <G stroke="#B76334" strokeWidth="1.5" opacity="0.7">
        <Line x1="240" y1="90"  x2="200" y2="115" />
        <Line x1="240" y1="90"  x2="245" y2="60"  />
        <Line x1="245" y1="60"  x2="230" y2="40"  />
        <Line x1="200" y1="115" x2="220" y2="140" />
        <Line x1="220" y1="140" x2="245" y2="150" />
        <Line x1="220" y1="140" x2="215" y2="165" />
        <Circle cx="240" cy="90"  r="4" fill="#E07B3C" />
        <Circle cx="245" cy="60"  r="3" fill="#C96F37" />
        <Circle cx="245" cy="150" r="4" fill="#E07B3C" />
      </G>
      <Path
        d="M130 45 C95 45, 68 68, 65 100 C62 125, 72 148, 85 162 C90 168, 92 178, 92 188 L168 188 C168 178, 170 168, 175 162 C188 148, 198 125, 195 100 C192 68, 165 45, 130 45 Z"
        fill="#C96F37" stroke="#E07B3C" strokeWidth="2"
      />
      <Path d="M108 188 L108 205 L152 205 L152 188 Z" fill="#C96F37" stroke="#E07B3C" strokeWidth="1.5" />
      <Circle cx="130" cy="115" r="52" fill="#EBA774" opacity="0.8" />
      <Circle cx="138" cy="112" r="34" fill="#E07B3C" opacity="0.95" />
      <Circle cx="150" cy="105" r="28" fill="#C96F37" />
      <Circle cx="110" cy="100" r="2.5" fill="#fff" opacity="0.9" />
      <Circle cx="155" cy="128" r="2"   fill="#fff" opacity="0.8" />
      <Circle cx="118" cy="132" r="1.5" fill="#fff" opacity="0.7" />
      <Circle cx="128" cy="92"  r="1.5" fill="#fff" opacity="0.6" />
      <Circle cx="142" cy="138" r="1.5" fill="#fff" opacity="0.7" />
      <Circle cx="138" cy="112" r="38" fill="transparent" stroke="#F0955A" strokeWidth="1" opacity="0.4" />
      <Circle cx="55"  cy="55"  r="2"   fill="#fff" opacity="0.7" />
      <Circle cx="205" cy="70"  r="1.5" fill="#fff" opacity="0.6" />
      <Circle cx="45"  cy="175" r="1.5" fill="#fff" opacity="0.5" />
      <Circle cx="215" cy="185" r="2"   fill="#fff" opacity="0.6" />
      <Circle cx="80"  cy="30"  r="1.5" fill="#fff" opacity="0.5" />
      <Circle cx="185" cy="35"  r="1"   fill="#fff" opacity="0.4" />
    </Svg>
  );
}

export default function SplashScreen({ navigation, route, onDone }) {
  // Both flags come back after the user accepts each legal document.
  const termsAccepted = route?.params?.termsAccepted === true;
  const privacyAccepted = route?.params?.privacyAccepted === true;
  const legalAccepted = termsAccepted && privacyAccepted;

  async function handleGetStarted() {
    try {
      await recordPreAuthLegalConsent();
      log.info('SplashScreen: recorded current Terms and Privacy consent');
    } catch (err) {
      log.warn('SplashScreen: could not persist legal consent', err?.message);
    }
    if (onDone) onDone();
  }

  function openTerms() {
    navigation.navigate('Terms', { consentFlow: true });
  }

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <SafeAreaView style={styles.safeBottom}>
        <View style={styles.root}>
          <LinearGradient
            colors={['#FDF6F0', '#FDF6F0', '#FDF6F0']}
            style={StyleSheet.absoluteFillObject}
          />
          {[
            [30,60],[80,20],[220,40],[250,90],[15,150],
            [260,160],[40,220],[200,240],[130,18],[170,250],
          ].map(([x,y],i) => (
            <View key={i} style={[styles.star, { left: x, top: y, opacity: 0.3 + (i % 3) * 0.2 }]} />
          ))}

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.illustrationWrap}>
              <BrainIllustration />
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.titleBold}>AD</Text>
              <Text style={styles.titleLight}>Chronotype</Text>
            </View>

            <Text style={styles.tagline}>
              Learn how sleep and lifestyle factors relate to cognitive health.
            </Text>

            <View style={styles.purposeCard}>
              <Text style={styles.purposeText}>
                This app is designed to raise awareness about the relationship between sleep chronotype and Alzheimer's risk factors — not to diagnose or predict disease.
              </Text>
            </View>

            <View style={styles.disclaimerCard}>
              <View style={styles.disclaimerHeader}>
                <Text style={styles.disclaimerIcon}>⚠️</Text>
                <Text style={styles.disclaimerTitle}>NOT A CLINICAL DIAGNOSIS</Text>
              </View>
              <Text style={styles.disclaimerBody}>
                <Text style={styles.appNameHighlight}>ADChronotype</Text>
                {' '}is a statistical research tool only. It is{' '}
                <Text style={styles.notHighlight}>NOT</Text>
                {' '}a medical diagnostic tool and does{' '}
                <Text style={styles.notHighlight}>NOT</Text>
                {' '}predict whether you will develop Alzheimer\'s Disease. Your score reflects a statistical comparison to research data — nothing more. If you have concerns about your cognitive health, please consult a licensed medical professional.
              </Text>
            </View>

            {/* T&C link — replaces checkbox */}
            <TouchableOpacity style={styles.termsRow} onPress={openTerms} activeOpacity={0.8}>
              <Text style={styles.termsText}>
                Review and accept our{' '}
                <Text style={styles.termsLink}>Terms & Conditions and Privacy Policy →</Text>
              </Text>
            </TouchableOpacity>

            {legalAccepted && (
              <View style={styles.acceptedBadge}>
                <Text style={styles.acceptedText}>✓ Terms and Privacy Policy accepted</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, !legalAccepted && styles.btnDisabled]}
              onPress={handleGetStarted}
              disabled={!legalAccepted}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Get Started  →</Text>
            </TouchableOpacity>

            {!legalAccepted && (
              <Text style={styles.readFirst}>
                Please read and accept both documents first
              </Text>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeTop:    { flex: 0, backgroundColor: '#FDF6F0', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#FDF6F0' },
  root:       { flex: 1, overflow: 'hidden' },
  star:       { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#fff' },
  scroll:     { alignItems: 'center', paddingHorizontal: 22, paddingTop: 16 },

  illustrationWrap: { marginBottom: 8 },

  titleRow:   { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  titleBold:  { color: '#ffffff', fontSize: 38, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  titleLight: { color: '#F0955A', fontSize: 38, fontWeight: '300' },

  tagline:    { color: '#8A6A4E', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20, paddingHorizontal: 10 },

  purposeCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 18, marginBottom: 14, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  purposeText: { color: '#3D2B1F', fontSize: 14, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal', textAlign: 'center', lineHeight: 22 },

  disclaimerCard:   { backgroundColor: '#FBEED2', borderRadius: 14, padding: 16, marginBottom: 20, width: '100%', borderWidth: 1.5, borderColor: '#E9A94A66' },
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  disclaimerIcon:   { fontSize: 16 },
  disclaimerTitle:  { color: '#E9A94A', fontSize: 13, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', letterSpacing: 0.5 },
  disclaimerBody:   { color: '#6B5744', fontSize: 12, lineHeight: 20 },
  appNameHighlight: { color: '#E9A94A', fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  notHighlight:     { color: '#E9A94A', fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },

  termsRow:   { width: '100%', marginBottom: 10, paddingHorizontal: 4 },
  termsText:  { color: '#8A6A4E', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  termsLink:  { color: '#E07B3C', fontFamily: 'Lexend_700Bold', fontWeight: 'normal', textDecorationLine: 'underline' },

  acceptedBadge: { backgroundColor: '#7EC49A22', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14, marginBottom: 10, alignSelf: 'center', borderWidth: 1, borderColor: '#7EC49A44' },
  acceptedText:  { color: '#7EC49A', fontSize: 12, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },

  readFirst:  { color: '#B09A86', fontSize: 11, textAlign: 'center', marginTop: 8 },

  btn:          { backgroundColor: '#E07B3C', borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnDisabled:  { backgroundColor: '#C98B65', opacity: 0.6 },
  btnText:      { color: '#fff', fontSize: 17, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
});
