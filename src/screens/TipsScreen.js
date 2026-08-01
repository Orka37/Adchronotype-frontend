import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Platform, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useCaregiverRequestCount } from '../hooks/useCaregiverRequestCount';
import { log } from '../utils/logger';

const TIPS = [
  {
    cat: 'CHRONOTYPE',
    icon: '🌙',
    title: 'Understanding Your Chronotype',
    body: 'Your chronotype is your body\'s natural sleep-wake preference. It directly affects when your brain performs best and is linked to Alzheimer\'s risk.',
    links: [
      { label: "What's Your Chronotype? — Sleep Foundation", url: 'https://www.sleepfoundation.org/circadian-rhythm/chronotype' },
      { label: 'Can You Change Your Chronotype? — Healthline', url: 'https://www.healthline.com/health/sleep/chronotype' },
      { label: 'Take the Chronotype Quiz (MEQ)', url: 'https://www.cet-surveys.com/index.php?sid=61524' },
    ],
  },
  {
    cat: 'SLEEP QUALITY',
    icon: '😴',
    title: 'Sleep & Brain Health',
    body: 'During deep sleep your brain flushes out toxic proteins linked to Alzheimer\'s disease. Consistent quality sleep is one of the most powerful protective factors.',
    links: [
      { label: "Sleep and Alzheimer's — Alzheimer's Association", url: 'https://www.alz.org/alzheimers-dementia/research_progress/sleep-and-alzheimers' },
      { label: 'How Sleep Clears the Brain — NIH', url: 'https://newsinhealth.nih.gov/2013/11/sleep-your-brain' },
      { label: 'Sleep Tips — CDC', url: 'https://www.cdc.gov/sleep/about_sleep/sleep_hygiene.html' },
      { label: 'Sleep Restriction & Amyloid — ScienceDaily (2025)', url: 'https://www.sciencedaily.com/releases/2025/01/250127124458.htm' },
    ],
  },
  {
    cat: 'BMI & DIET',
    icon: '⚖️',
    title: 'Weight, Diet and Brain Risk',
    body: 'Maintaining a healthy BMI and following a brain-healthy diet are among the strongest modifiable risk factors for dementia prevention.',
    links: [
      { label: "BMI & Dementia Risk — Alzheimer's Society", url: 'https://www.alzheimers.org.uk/about-dementia/managing-the-risk-of-dementia/reduce-your-risk-of-dementia/obesity' },
      { label: 'Healthy Weight — CDC', url: 'https://www.cdc.gov/healthyweight/index.html' },
      { label: 'Mediterranean Diet & Brain Health — Harvard', url: 'https://www.health.harvard.edu/mind-and-mood/the-mind-diet' },
    ],
  },
  {
    cat: 'FAMILY HISTORY',
    icon: '👪',
    title: 'Genetics Is Not Destiny',
    body: 'Having a family history raises risk but does not determine your outcome. The Lancet Commission found up to 45% of dementia cases are preventable through lifestyle changes.',
    links: [
      { label: "Family History & Alzheimer's — Alzheimer's Association", url: 'https://www.alz.org/alzheimers-dementia/what-is-alzheimers/causes-and-risk-factors/genetics' },
      { label: 'APOE Gene Explained — NIA', url: 'https://www.nia.nih.gov/health/alzheimers-causes-and-risk-factors/genetics-alzheimers-disease' },
      { label: 'Lancet 2024 — 45% Dementia Is Preventable', url: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(24)01296-0/fulltext' },
    ],
  },
  {
    cat: 'AGE & MIDLIFE',
    icon: '🧠',
    title: 'Why Midlife Is the Critical Window',
    body: 'Changes that lead to Alzheimer\'s begin decades before symptoms appear. Taking action in your 40s and 50s has the greatest impact on your long-term brain health.',
    links: [
      { label: "Early Detection — Alzheimer's Association", url: 'https://www.alz.org/alzheimers-dementia/diagnosis/early-detection' },
      { label: 'Modifiable Risk Factors — NIA', url: 'https://www.nia.nih.gov/health/alzheimers-and-dementia/what-do-we-know-about-diet-and-prevention-alzheimers-disease' },
      { label: 'Brain Health in Midlife — CDC', url: 'https://www.cdc.gov/aging/data/dementia.htm' },
    ],
  },
];

export default function TipsScreen({ navigation }) {
  const [expanded, setExpanded] = useState(null);
  const caregiverRequestCount = useCaregiverRequestCount();

  function openLink(url) {
    Linking.openURL(url).catch(() => {
      log.warn('TipsScreen: could not open URL', url);
    });
  }

  function toggle(idx) {
    setExpanded(prev => (prev === idx ? null : idx));
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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <Text style={styles.heading}>Research Tips</Text>
            <Text style={styles.sub}>
              Evidence-based resources on each factor that influences your brain health score.
            </Text>

            {TIPS.map((tip, idx) => {
              const open = expanded === idx;
              return (
                <View key={idx} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggle(idx)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.catRow}>
                      <Text style={styles.catIcon}>{tip.icon}</Text>
                      <View>
                        <Text style={styles.catLabel}>{tip.cat}</Text>
                        <Text style={styles.catTitle}>{tip.title}</Text>
                      </View>
                    </View>
                    <Feather
                      name={open ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#6c7094"
                    />
                  </TouchableOpacity>

                  {open && (
                    <View style={styles.cardBody}>
                      <Text style={styles.bodyText}>{tip.body}</Text>
                      <View style={styles.links}>
                        {tip.links.map((lnk, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.linkRow}
                            onPress={() => openLink(lnk.url)}
                            activeOpacity={0.7}
                          >
                            <Feather name="external-link" size={12} color="#7c3aed" style={{ marginRight: 7, marginTop: 2 }} />
                            <Text style={styles.linkText}>{lnk.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Bottom nav — Tips active */}
          <View style={styles.navWrap}>
            <View style={styles.nav}>
              {[
                { label: 'Home',    icon: 'home',         active: false, onPress: () => navigation.navigate('Report') },
                { label: 'Sleep',   icon: 'moon',         active: false, onPress: () => navigation.navigate('SleepLog') },
                { label: 'Tips',    icon: 'book-open',    active: true,  onPress: null },
                { label: 'Caregiver', icon: 'users',      active: false, onPress: () => navigation.navigate('Caregiver'), badgeCount: caregiverRequestCount },
                { label: 'Profile', icon: 'user',         active: false, onPress: () => navigation.navigate('Profile') },
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
                  <Feather name={t.icon} size={22} color={t.active ? '#8a52f3' : '#6c7094'} />
                  <Text style={[styles.navLabel, t.active && { color: '#8a52f3' }]}>{t.label}</Text>
                  {t.active && <View style={styles.activeDot} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeTop:    { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#030A31' },
  root:       { flex: 1 },
  scroll:     { padding: 20, paddingTop: 32 },
  heading:    { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 8 },
  sub:        { color: '#6c7094', fontSize: 13, lineHeight: 20, marginBottom: 24 },

  card:       { backgroundColor: '#161b3d', borderRadius: 16, borderWidth: 1, borderColor: '#1f254f', marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  catRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  catIcon:    { fontSize: 22 },
  catLabel:   { color: '#7c3aed', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  catTitle:   { color: '#fff', fontSize: 13, fontWeight: '700' },

  cardBody:   { borderTopWidth: 1, borderTopColor: '#1f254f', padding: 16, paddingTop: 14 },
  bodyText:   { color: '#8c91b5', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  links:      { gap: 10 },
  linkRow:    { flexDirection: 'row', alignItems: 'flex-start' },
  linkText:   { color: '#7c3aed', fontSize: 12, lineHeight: 18, flex: 1, textDecorationLine: 'underline' },

  navWrap:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#030A31', borderTopWidth: 1, borderTopColor: '#1f254f' },
  nav:        { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  navItem:    { alignItems: 'center', width: 64 },
  navBadge: { position: 'absolute', top: -5, right: 13, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#ff5c5c', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 2 },
  navBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  navLabel:   { color: '#6c7094', fontSize: 10, marginTop: 4, fontWeight: '600' },
  navLabelDisabled: { color: '#3a4060' },
  activeDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: '#8a52f3', position: 'absolute', bottom: -8 },
});
