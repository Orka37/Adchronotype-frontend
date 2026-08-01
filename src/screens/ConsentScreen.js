import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { log } from '../utils/logger';

const CONSENT_POINTS = [
  'You acknowledge the terms and conditions shown on this page.',
  'The owners of the app will have access to all of your lifestyle factors as well as your score and its breakdown.',
  'Your password is stored using secure one-way hashing and is never stored as plain text.',
  'The owners of the app will NOT utilize any of your data without your full consent.',
];

export default function ConsentScreen({ navigation }) {
  const { markConsentGiven } = useAuth();

  async function handleConsent() {
    log.info('ConsentScreen: user gave consent');
    await markConsentGiven();
    navigation.replace('SleepType');
  }

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <SafeAreaView style={styles.safeBottom}>
        <View style={styles.root}>
          <LinearGradient
            colors={['#030827', '#030A31']}
            style={StyleSheet.absoluteFillObject}
          />
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Consent</Text>
            <Text style={styles.subtitle}>
              By using this app you fully consent to/acknowledge the following:
            </Text>

            {CONSENT_POINTS.map((point, i) => (
              <View key={i} style={styles.point}>
                <View style={styles.bullet} />
                <Text style={styles.pointText}>{point}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.btn}
              onPress={handleConsent}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>I Consent!</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeTop:    { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#030A31' },
  root:       { flex: 1 },
  scroll:     { padding: 28, paddingTop: 48 },
  title:      { color: '#ffffff', fontSize: 32, fontWeight: '800', fontStyle: 'italic', textAlign: 'center', marginBottom: 28 },
  subtitle:   { color: '#ffffff', fontSize: 16, fontWeight: '700', fontStyle: 'italic', marginBottom: 28, lineHeight: 24 },
  point:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  bullet:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', marginTop: 7, marginRight: 14, flexShrink: 0 },
  pointText:  { color: '#e0e0e0', fontSize: 15, lineHeight: 24, flex: 1 },
  btn:        { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, alignSelf: 'flex-start', marginTop: 16 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});
