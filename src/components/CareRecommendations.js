import CalmTimeline from './CalmTimeline';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getCarePatientCalmWindows, getCarePatientCircadianPlan } from '../api/caregivers';
import { useTheme, useThemedStyles } from '../theme/designTheme';

const localZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
};
const errorText = error => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map(item => item.msg).join('. ');
  if (error?.response?.status === 404) return 'Suggestions are not available on the server yet. Your saved logs are unchanged.';
  return typeof detail === 'string' ? detail : 'Could not load suggestions. Please try again.';
};
const rangeLabel = (start, end) => start === end ? start : `${start}–${end}${end < start ? ' (next day)' : ''}`;

export default function CareRecommendations({ patientId, revision }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [zone, setZone] = useState(localZone);
  const [days, setDays] = useState('14');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  useEffect(() => {
    request.current += 1; setResult(null); setError(''); setBusy(false);
    return () => { request.current += 1; };
  }, [patientId, revision]);

  function change(setter, value) {
    request.current += 1; setter(value); setResult(null); setError(''); setBusy(false);
  }
  async function generate() {
    if (!zone.trim() || !/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 90) {
      setError('Enter the patient’s time zone and a history length from 1 to 90 days.'); return;
    }
    const sequence = ++request.current;
    setBusy(true); setError(''); setResult(null);
    const body = { timezone: zone.trim(), lookback_days: Number(days) };
    try {
      const [plan, calm] = await Promise.all([
        getCarePatientCircadianPlan(patientId, body), getCarePatientCalmWindows(patientId, body),
      ]);
      if (sequence === request.current) setResult({ plan, calm });
    } catch (e) {
      if (sequence === request.current) setError(errorText(e));
    } finally { if (sequence === request.current) setBusy(false); }
  }
  const notes = items => items.map((note, i) => <Text key={i} style={styles.note}>{note}</Text>);
  return <View style={styles.section}>
    <Text style={styles.heading}>Suggestions from logs</Text>
    <Text style={styles.note}>Confirm the patient’s time zone; it starts with this device’s setting. Suggestions do not change the saved routine.</Text>
    <Text style={styles.label}>Patient time zone</Text>
    <TextInput accessibilityLabel="Patient time zone" autoCapitalize="none" autoCorrect={false} value={zone} onChangeText={v => change(setZone, v)} style={styles.input} placeholder="America/Chicago" placeholderTextColor={colors.secondary} />
    <Text style={styles.label}>Days of history (1–90)</Text>
    <TextInput accessibilityLabel="Days of history" keyboardType="number-pad" maxLength={2} value={days} onChangeText={v => change(setDays, v)} style={styles.input} />
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={generate} style={[styles.button, busy && styles.disabled]}>
      {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.buttonText}>{result ? 'Refresh suggestions' : 'Generate suggestions'}</Text>}
    </TouchableOpacity>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {result && <>
      <View style={styles.card}>
        <Text style={styles.title}>Day-night plan</Text>
        <Text style={styles.note}>{result.plan.days_of_data} days of sleep and wake records — {zone.trim()}</Text>
        {result.plan.status === 'ok' ? <>
          <Text style={styles.time}>Suggested wake — {result.plan.recommended_wake}</Text>
          <Text style={styles.time}>Suggested bedtime — {result.plan.recommended_bed}</Text>
          {result.plan.blocks.map((block, i) => <View key={i} style={styles.block}>
            <Text style={styles.time}>{rangeLabel(block.start, block.end)}</Text>
            <Text style={styles.body}>{block.activity}</Text>
            <Text style={styles.note}>{block.reason}</Text>
          </View>)}
        </> : <Text style={styles.body}>Still learning the patient’s rhythm</Text>}
        {notes(result.plan.notes)}
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Calm windows</Text>
        <Text style={styles.note}>{result.calm.days_of_data} days with logs — {zone.trim()}</Text>
        {result.calm.status === 'ok' ? <>
          <CalmTimeline calmWindows={result.calm.calm_windows} hardWindows={result.calm.hard_windows}/>
          {[['Fewer recorded incidents', result.calm.calm_windows], ['More recorded incidents', result.calm.hard_windows]].map(([label, windows]) => <View key={label} style={styles.block}>
            <Text style={styles.body}>{label}</Text>
            {windows.length ? windows.map((window, i) => <Text key={i} style={styles.time}>{rangeLabel(window.start, window.end)}</Text>) : <Text style={styles.note}>No matching window in these logs.</Text>}
          </View>)}
        </> : <Text style={styles.body}>More agitation records are needed to identify a pattern.</Text>}
        {notes(result.calm.notes)}
        <Text style={styles.note}>For planning routine care. Do not use these times to change prescribed medication schedules.</Text>
      </View>
    </>}
  </View>;
}
const makeStyles = c => StyleSheet.create({
  section: { marginBottom: 20 }, heading: { fontFamily: 'Lexend_700Bold', color: c.text, fontSize: 18, marginBottom: 6 },
  title: { fontFamily: 'Lexend_700Bold', color: c.text, fontSize: 16, marginBottom: 6 },
  label: { fontFamily: 'Lexend_500Medium', color: c.text, fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.border, borderRadius:6, padding: 12, color: c.text, backgroundColor: c.surface, fontFamily: 'Lexend_400Regular', fontSize: 14 },
  button: { backgroundColor: c.brand, padding: 14, borderRadius:6, alignItems: 'center', marginTop: 12, minHeight: 48 },
  buttonText: { color: c.onBrand, fontFamily: 'Lexend_700Bold', fontSize: 14 }, disabled: { opacity: 0.6 },
  card: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius:6, padding: 16, marginTop: 14 },
  block: { borderTopWidth: 1, borderColor: c.border, paddingTop: 12, marginTop: 12 },
  body: { color: c.text, fontFamily: 'Lexend_500Medium', fontSize: 14, lineHeight: 21, marginVertical: 4 },
  time: { color: c.accent, fontFamily: 'Lexend_600SemiBold', fontSize: 14, lineHeight: 22, marginVertical: 4 },
  note: { color: c.secondary, fontFamily: 'Lexend_400Regular', fontSize: 12, lineHeight: 19, marginVertical: 4 },
  error: { color: c.errorText || c.text, fontFamily: 'Lexend_400Regular', fontSize: 13, marginTop: 12 },
});
