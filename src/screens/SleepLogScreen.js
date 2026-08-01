import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Platform, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Line } from 'react-native-svg';
import { createSleepLog, getSleepLogs } from '../api/sleepLogs';
import { useCaregiverRequestCount } from '../hooks/useCaregiverRequestCount';
import { parseApiError } from '../utils/errors';
import { log } from '../utils/logger';
import { getStoredItem, setStoredItem } from '../utils/storage';

const HOURS   = [1,2,3,4,5,6,7,8,9,10,11,12];
const MINUTES = [0,30];
const ITEM_H  = 44;

function clockAngleForValue(value, mode) {
  const clockPosition = mode === 'hour' ? value % 12 : value / 5;
  return (clockPosition / 12) * Math.PI * 2 - Math.PI / 2;
}

function roundMinuteToHalfHour(minute) {
  if (minute <= 15) return 0;
  if (minute < 45) return 30;
  return 0;
}

function normalizeHalfHourTime(h, m, ap) {
  if (m < 45) return { h, m: roundMinuteToHalfHour(m), ap };

  if (h === 11) return { h: 12, m: 0, ap: ap === 'AM' ? 'PM' : 'AM' };
  if (h === 12) return { h: 1, m: 0, ap };
  return { h: h + 1, m: 0, ap };
}

function DrumWheel({ items, selected, onSelect }) {
  const scrollRef = useRef(null);
  const tripled   = [...items, ...items, ...items];
  const midOffset = items.length * ITEM_H;

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx < 0 || !scrollRef.current) return;
    scrollRef.current.scrollTo({ y: midOffset + idx * ITEM_H - ITEM_H * 2, animated: false });
  }, [selected]);

  function onMomentumEnd(e) {
    const y   = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H) % items.length;
    const real = (idx + items.length) % items.length;
    onSelect(items[real]);
  }

  return (
    <View style={{ flex: 1, height: ITEM_H * 5, overflow: 'hidden', position: 'relative' }}>
      <View style={{ position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#7c3aed55', backgroundColor: '#7c3aed0a', zIndex: 1 }} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        style={{ height: ITEM_H * 5 }}
      >
        {tripled.map((v, i) => {
          const isSel = v === selected && Math.floor(i / items.length) === 1;
          return (
            <TouchableOpacity
              key={i}
              style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => onSelect(v)}
              activeOpacity={0.7}
            >
              <Text style={{ color: isSel ? '#fff' : '#4a5270', fontSize: isSel ? 22 : 17, fontWeight: isSel ? '800' : '500' }}>
                {String(v).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLEEP_LOGS_KEY = 'sleepLogs';

function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayLabel(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function startOfWeek(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function durationHours(bedH, bedM, bedAP, wakeH, wakeM, wakeAP) {
  let bed = ((bedH % 12) + (bedAP === 'PM' ? 12 : 0)) * 60 + bedM;
  let wake = ((wakeH % 12) + (wakeAP === 'AM' ? 0 : 12)) * 60 + wakeM;
  let diff = wake - bed;
  if (diff < 0) diff += 1440;
  return diff / 60;
}

function toBackendTime(h, m, ap) {
  const hour24 = (h % 12) + (ap === 'PM' ? 12 : 0);
  return `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fromBackendTime(value, fallbackH, fallbackM, fallbackAP) {
  if (!value) return { h: fallbackH, m: fallbackM, ap: fallbackAP };
  const [hourRaw, minuteRaw] = value.split(':').map(Number);
  const ap = hourRaw >= 12 ? 'PM' : 'AM';
  const h = hourRaw % 12 || 12;
  return normalizeHalfHourTime(h, minuteRaw || 0, ap);
}

function formatBackendDisplay(value) {
  const parsed = fromBackendTime(value, 10, 0, 'PM');
  return `${String(parsed.h).padStart(2, '0')}:${String(parsed.m).padStart(2, '0')} ${parsed.ap}`;
}

function fromDisplayTime(value, fallbackH, fallbackM, fallbackAP) {
  if (!value) return { h: fallbackH, m: fallbackM, ap: fallbackAP };
  const [time = '', ap = fallbackAP] = value.split(' ');
  const [hourRaw, minuteRaw] = time.split(':').map(Number);
  return normalizeHalfHourTime(
    Number.isFinite(hourRaw) ? hourRaw : fallbackH,
    Number.isFinite(minuteRaw) ? minuteRaw : fallbackM,
    ap === 'AM' || ap === 'PM' ? ap : fallbackAP,
  );
}

function qualityForUi(score) {
  if (score == null) return 10;
  return Math.max(0, Math.min(21, score));
}

function mapBackendLogs(records) {
  return records.reduce((acc, record) => {
    const date = new Date(record.logged_date);
    const key = toDateKey(date);
    const current = acc[key];
    if (current && new Date(current.loggedAt) > new Date(record.created_at)) return acc;

    acc[key] = {
      id: record.id,
      date: key,
      day: dayLabel(date),
      hours: record.duration_hours,
      bedTime: formatBackendDisplay(record.sleep_time),
      wakeTime: formatBackendDisplay(record.wake_time),
      qualityScore: record.quality_score,
      awakenings: record.awakenings,
      notes: record.notes,
      loggedAt: record.created_at,
      source: 'backend',
    };
    return acc;
  }, {});
}

function averageForRange(logs, startDate, dayCount) {
  const values = [];
  for (let i = 0; i < dayCount; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const logForDay = logs[toDateKey(date)];
    if (logForDay) values.push(logForDay.hours);
  }
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default function SleepLogScreen({ navigation }) {
  const [bedH,    setBedH]    = useState(10);
  const [bedM,    setBedM]    = useState(0);
  const [bedAP,   setBedAP]   = useState('PM');
  const [wakeH,   setWakeH]   = useState(6);
  const [wakeM,   setWakeM]   = useState(30);
  const [wakeAP,  setWakeAP]  = useState('AM');
  const [saved,   setSaved]   = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qualityScore, setQualityScore] = useState(10);
  const [awakenings, setAwakenings] = useState(0);
  const [dataSource, setDataSource] = useState('backend');
  const [sleepLogs, setSleepLogs] = useState({});
  const [editingToday, setEditingToday] = useState(false);
  const [picker,  setPicker]  = useState(null); // 'bed' | 'wake' | null
  const [pickerStep, setPickerStep] = useState('hour');
  const [tmpH,    setTmpH]    = useState(10);
  const [tmpM,    setTmpM]    = useState(0);
  const [tmpAP,   setTmpAP]   = useState('PM');
  const caregiverRequestCount = useCaregiverRequestCount();

  useEffect(() => {
    let mounted = true;
    async function loadLogs() {
      try {
        setLoadingLogs(true);
        const records = await getSleepLogs();
        if (!mounted) return;
        const mapped = mapBackendLogs(records);
        setSleepLogs(mapped);
        setDataSource('backend');
        await setStoredItem(SLEEP_LOGS_KEY, JSON.stringify(mapped)).catch(() => {});
        log.info('SleepLogScreen: backend logs loaded', { count: records.length });
      } catch (err) {
        log.warn('SleepLogScreen: backend logs unavailable, using local fallback', err?.message);
        try {
          const raw = await getStoredItem(SLEEP_LOGS_KEY);
          if (mounted && raw) {
            setSleepLogs(JSON.parse(raw));
            setDataSource('local');
          }
        } catch (storageErr) {
          log.warn('SleepLogScreen: could not load local sleep logs', storageErr?.message);
        }
      } finally {
        if (mounted) setLoadingLogs(false);
      }
    }
    loadLogs();
    return () => { mounted = false; };
  }, []);

  function openPicker(mode) {
    const h = mode === 'bed' ? bedH : wakeH;
    const m = mode === 'bed' ? bedM : wakeM;
    const ap = mode === 'bed' ? bedAP : wakeAP;
    const normalized = normalizeHalfHourTime(h, m, ap);
    setTmpH(normalized.h); setTmpM(normalized.m); setTmpAP(normalized.ap);
    setPickerStep('hour');
    setPicker(mode);
  }

  function confirmPicker() {
    if (picker === 'bed') { setBedH(tmpH); setBedM(tmpM); setBedAP(tmpAP); }
    else { setWakeH(tmpH); setWakeM(tmpM); setWakeAP(tmpAP); }
    setPicker(null);
  }

  function editTodayLog() {
    const logForToday = sleepLogs[toDateKey()];
    if (!logForToday) return;
    const bed = fromDisplayTime(logForToday.bedTime, 10, 0, 'PM');
    const wake = fromDisplayTime(logForToday.wakeTime, 6, 30, 'AM');
    setBedH(bed.h); setBedM(bed.m); setBedAP(bed.ap);
    setWakeH(wake.h); setWakeM(wake.m); setWakeAP(wake.ap);
    setQualityScore(qualityForUi(logForToday.qualityScore));
    setAwakenings(logForToday.awakenings ?? 0);
    setEditingToday(true);
  }

  function calcDuration() {
    let b = ((bedH % 12) + (bedAP === 'PM' ? 12 : 0)) * 60 + bedM;
    let w = ((wakeH % 12) + (wakeAP === 'AM' ? 0 : 12)) * 60 + wakeM;
    let diff = w - b;
    if (diff < 0) diff += 1440;
    return `${Math.floor(diff / 60)}h ${diff % 60 > 0 ? (diff % 60) + 'm' : ''}`.trim();
  }

  async function handleSave() {
    if (saving) return;
    const key = toDateKey();
    const hours = durationHours(bedH, bedM, bedAP, wakeH, wakeM, wakeAP);
    const localRecord = {
      date: key,
      day: dayLabel(),
      hours,
      bedTime: fmt(bedH, bedM, bedAP),
      wakeTime: fmt(wakeH, wakeM, wakeAP),
      qualityScore,
      awakenings,
      loggedAt: new Date().toISOString(),
    };

    try {
      setSaving(true);
      const savedRecord = await createSleepLog({
        sleep_time: toBackendTime(bedH, bedM, bedAP),
        wake_time: toBackendTime(wakeH, wakeM, wakeAP),
        duration_hours: Number(hours.toFixed(2)),
        quality_score: qualityScore,
        awakenings,
        notes: null,
        logged_date: `${key}T12:00:00.000Z`,
      });
      const backendRecord = mapBackendLogs([savedRecord])[key] ?? localRecord;
      const nextLogs = { ...sleepLogs, [key]: backendRecord };
      setSleepLogs(nextLogs);
      setDataSource('backend');
      await setStoredItem(SLEEP_LOGS_KEY, JSON.stringify(nextLogs)).catch(() => {});
      log.info('SleepLogScreen: backend sleep log saved', backendRecord);
      setEditingToday(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const nextLogs = { ...sleepLogs, [key]: { ...localRecord, source: 'local' } };
      setSleepLogs(nextLogs);
      setDataSource('local');
      await setStoredItem(SLEEP_LOGS_KEY, JSON.stringify(nextLogs))
        .catch(storageErr => log.warn('SleepLogScreen: could not persist fallback sleep log', storageErr?.message));
      log.error('SleepLogScreen.handleSave', err);
      setEditingToday(false);
      Alert.alert('Saved locally', `We could not reach the backend. ${parseApiError(err)}`);
    } finally {
      setSaving(false);
    }
  }

  function fmt(h, m, ap) {
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ap}`;
  }

  const weekStart = startOfWeek();
  const weekly = WEEK_DAYS.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = toDateKey(date);
    const logForDay = sleepLogs[key];
    return { day, hours: logForDay?.hours ?? 0, logged: !!logForDay };
  });
  const loggedDays = weekly.filter(d => d.logged);
  const avgHours = loggedDays.length
    ? (loggedDays.reduce((sum, d) => sum + d.hours, 0) / loggedDays.length).toFixed(1)
    : null;
  const maxH = Math.max(8, ...weekly.map(d => d.hours));
  const todayLog = sleepLogs[toDateKey()];
  const showSleepForm = !todayLog || editingToday;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayLog = sleepLogs[toDateKey(yesterday)];
  const sleepChangePct = todayLog && yesterdayLog
    ? Math.round(((todayLog.hours - yesterdayLog.hours) / yesterdayLog.hours) * 100)
    : null;
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(weekStart.getDate() - 7);
  const currentWeekAverage = averageForRange(sleepLogs, weekStart, 7);
  const previousWeekAverage = averageForRange(sleepLogs, previousWeekStart, 7);
  const weekChangePct = currentWeekAverage && previousWeekAverage
    ? Math.round(((currentWeekAverage - previousWeekAverage) / previousWeekAverage) * 100)
    : null;
  const clockItems = pickerStep === 'hour' ? HOURS : MINUTES;
  const selectedClockValue = pickerStep === 'hour' ? tmpH : tmpM;
  const handAngle = clockAngleForValue(selectedClockValue, pickerStep);
  const handEndX = 130 + Math.cos(handAngle) * 104;
  const handEndY = 130 + Math.sin(handAngle) * 104;

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <SafeAreaView style={styles.safeBottom}>
        <View style={styles.root}>
          <LinearGradient colors={['#030827', '#030A31']} style={StyleSheet.absoluteFillObject} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.heading}>Sleep Log</Text>
              <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
            </View>

            {/* Weekly chart */}
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>This Week</Text>
                <View style={styles.avgBadge}>
                  <Text style={styles.avgText}>
                    {loadingLogs ? 'Loading...' : avgHours ? `Avg ${avgHours}h` : 'No logs yet'}
                  </Text>
                </View>
              </View>
              <View style={styles.bars}>
                {weekly.map((d, i) => (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      {d.logged
                        ? <View style={[styles.barFill, { height: `${(d.hours / maxH) * 100}%`, backgroundColor: d.hours >= 7 ? '#7c3aed' : '#ffb830' }]} />
                        : <View style={[styles.barFill, { height: '8%', backgroundColor: '#1f254f' }]} />
                      }
                    </View>
                    <Text style={styles.barLabel}>{d.day}</Text>
                  </View>
                ))}
              </View>

              {loadingLogs ? (
                <View style={styles.statPill}>
                  <ActivityIndicator color="#7c3aed" />
                </View>
              ) : loggedDays.length === 0 ? (
                <View style={styles.statPill}>
                  <Text style={styles.statPillText}>Save tonight's sleep to start building your weekly chart.</Text>
                </View>
              ) : sleepChangePct != null ? (
                <View style={[styles.statPill, { backgroundColor: sleepChangePct >= 0 ? '#00c9b111' : '#ff5c5c11', borderColor: sleepChangePct >= 0 ? '#00c9b133' : '#ff5c5c33' }]}>
                  <Text style={styles.statPillText}>
                    Sleep duration{' '}
                    <Text style={{ color: sleepChangePct >= 0 ? '#00c9b1' : '#ff5c5c', fontWeight: '700' }}>
                      {sleepChangePct >= 0 ? `+${sleepChangePct}%` : `${sleepChangePct}%`}
                    </Text>
                    {' '}compared to yesterday
                  </Text>
                </View>
              ) : (
                <View style={styles.statPill}>
                  <Text style={styles.statPillText}>Log another day to compare sleep trends.</Text>
                </View>
              )}

              <View style={[styles.statPill, styles.weekPill]}>
                <Text style={styles.statPillText}>
                  {weekChangePct != null
                    ? (
                      <>
                        Weekly average{' '}
                        <Text style={{ color: weekChangePct >= 0 ? '#00c9b1' : '#ff5c5c', fontWeight: '700' }}>
                          {weekChangePct >= 0 ? `+${weekChangePct}%` : `${weekChangePct}%`}
                        </Text>
                        {' '}vs last week
                      </>
                    )
                    : 'Log more days to compare this week with last week.'}
                </Text>
              </View>
              {dataSource === 'local' && (
                <Text style={styles.sourceHint}>Showing locally saved sleep logs until backend sync is available.</Text>
              )}
            </View>

            {/* Log tonight */}
            <View style={styles.card}>
              <View style={styles.logHeaderRow}>
                <Text style={styles.cardTitle}>{todayLog ? "Today's Sleep" : "Log Tonight's Sleep"}</Text>
                {todayLog && !showSleepForm && (
                  <TouchableOpacity
                    style={styles.editLogBtn}
                    onPress={editTodayLog}
                    activeOpacity={0.8}
                  >
                    <Feather name="edit-2" size={13} color="#c8b8ff" />
                    <Text style={styles.editLogText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!showSleepForm ? (
                <View style={styles.collapsedLog}>
                  <View style={styles.collapsedItem}>
                    <Text style={styles.collapsedLabel}>🌙 Bedtime</Text>
                    <Text style={styles.collapsedValue}>{todayLog.bedTime}</Text>
                  </View>
                  <View style={styles.collapsedDivider} />
                  <View style={styles.collapsedItem}>
                    <Text style={styles.collapsedLabel}>☀️ Wake-up</Text>
                    <Text style={styles.collapsedValue}>{todayLog.wakeTime}</Text>
                  </View>
                </View>
              ) : (
                <>
                  {/* Bedtime tap card */}
                  <Text style={styles.fieldLabel}>🌙  Bedtime</Text>
                  <TouchableOpacity style={styles.timeCard} onPress={() => openPicker('bed')} activeOpacity={0.8}>
                    <Text style={styles.timeCardVal}>{fmt(bedH, bedM, bedAP)}</Text>
                    <Feather name="chevron-down" size={16} color="#6c7094" />
                  </TouchableOpacity>

                  {/* Wake time tap card */}
                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>☀️  Wake-up Time</Text>
                  <TouchableOpacity style={[styles.timeCard, styles.wakeTimeCard]} onPress={() => openPicker('wake')} activeOpacity={0.8}>
                    <Text style={styles.timeCardVal}>{fmt(wakeH, wakeM, wakeAP)}</Text>
                    <Feather name="chevron-down" size={16} color="#6c7094" />
                  </TouchableOpacity>

                  {/* Duration */}
                  <View style={styles.durRow}>
                    <Text style={styles.durLabel}>Total sleep:</Text>
                    <Text style={styles.durVal}>{calcDuration()}</Text>
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Sleep Quality</Text>
                  <View style={styles.qualityScale}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setQualityScore(value => Math.max(0, value - 1))}
                      activeOpacity={0.8}
                    >
                      <Feather name="minus" size={16} color="#c8b8ff" />
                    </TouchableOpacity>
                    <View style={styles.qualityValueWrap}>
                      <Text style={styles.qualityValue}>{qualityScore}</Text>
                      <Text style={styles.qualityRange}>0-21</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setQualityScore(value => Math.min(21, value + 1))}
                      activeOpacity={0.8}
                    >
                      <Feather name="plus" size={16} color="#c8b8ff" />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Awakenings</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setAwakenings(value => Math.max(0, value - 1))}
                      activeOpacity={0.8}
                    >
                      <Feather name="minus" size={16} color="#c8b8ff" />
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>{awakenings}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setAwakenings(value => Math.min(20, value + 1))}
                      activeOpacity={0.8}
                    >
                      <Feather name="plus" size={16} color="#c8b8ff" />
                    </TouchableOpacity>
                  </View>

                  {/* Save */}
                  <TouchableOpacity
                    style={[styles.saveBtn, saved && styles.saveBtnOk]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    {saving
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.saveBtnText}>{saved ? '✓ Saved!' : todayLog ? 'Update Sleep Log' : 'Save Sleep Log'}</Text>
                    }
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.hint}>💡 Logging daily tracks your brain health score over time.</Text>
            </View>

            {/* Coming soon */}
            <View style={styles.comingSoonCard}>
              <Text style={styles.comingSoonTitle}>🔗 Auto-sync Coming Soon</Text>
              <Text style={styles.comingSoonBody}>Future versions will sync from Apple Health, Google Fit, and Fitbit automatically.</Text>
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Bottom nav */}
          <View style={styles.navWrap}>
            <View style={styles.nav}>
              {[
                { label: 'Home',    icon: 'home',      active: false, onPress: () => navigation.navigate('Report') },
                { label: 'Sleep',   icon: 'moon',      active: true,  onPress: null },
                { label: 'Tips',    icon: 'book-open', active: false, onPress: () => navigation.navigate('Tips') },
                { label: 'Caregiver', icon: 'users',   active: false, onPress: () => navigation.navigate('Caregiver'), badgeCount: caregiverRequestCount },
                { label: 'Profile', icon: 'user',      active: false, onPress: () => navigation.navigate('Profile') },
              ].map(t => (
                <TouchableOpacity key={t.label} style={styles.navItem} onPress={t.onPress} disabled={t.active} activeOpacity={0.7}>
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

      {/* Time picker modal */}
      <Modal visible={picker !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setPicker(null)} />
          <View style={styles.pickerBox}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {picker === 'bed' ? '🌙  Set Bedtime' : '☀️  Set Wake-up Time'}
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={confirmPicker}>
                <Text style={styles.doneBtnText}>Done ✓</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.clockHeaderRow}>
              <TouchableOpacity style={[styles.clockTab, pickerStep === 'hour' && styles.clockTabOn]} onPress={() => setPickerStep('hour')}>
                <Text style={[styles.clockTabText, pickerStep === 'hour' && styles.clockTabTextOn]}>Hour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.clockTab, pickerStep === 'minute' && styles.clockTabOn]} onPress={() => setPickerStep('minute')}>
                <Text style={[styles.clockTabText, pickerStep === 'minute' && styles.clockTabTextOn]}>Minute</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.clockFace}>
              <Svg width={260} height={260} style={styles.clockHandLayer} pointerEvents="none">
                <Line x1={130} y1={130} x2={handEndX} y2={handEndY} stroke="#7c3aed" strokeWidth={4} strokeLinecap="round" />
              </Svg>
              {clockItems.map(item => {
                const angle = clockAngleForValue(item, pickerStep);
                const radius = 104;
                const left = 130 + Math.cos(angle) * radius - 20;
                const top = 130 + Math.sin(angle) * radius - 20;
                const selected = pickerStep === 'hour' ? item === tmpH : item === tmpM;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.clockNumber, { left, top }, selected && styles.clockNumberOn]}
                    onPress={() => pickerStep === 'hour' ? setTmpH(item) : setTmpM(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.clockNumberText, selected && styles.clockNumberTextOn]}>
                      {String(item).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.clockCenter} />
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewText}>{String(tmpH).padStart(2,'0')}:{String(tmpM).padStart(2,'0')} {tmpAP}</Text>
            </View>
            <View style={styles.ampmRow}>
              {['AM','PM'].map(ap => (
                <TouchableOpacity
                  key={ap}
                  style={[styles.apBtn, tmpAP === ap && styles.apBtnOn]}
                  onPress={() => setTmpAP(ap)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.apText, tmpAP === ap && styles.apTextOn]}>{ap}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeTop:    { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#030A31' },
  root:       { flex: 1 },
  scroll:     { padding: 18, paddingTop: 28 },

  header:  { marginBottom: 18 },
  heading: { color: '#fff', fontSize: 24, fontWeight: '800' },
  date:    { color: '#6c7094', fontSize: 12, marginTop: 2 },

  card:     { backgroundColor: '#161b3d', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1f254f' },
  cardRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  avgBadge: { backgroundColor: '#7c3aed22', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: '#7c3aed44' },
  avgText:  { color: '#7c3aed', fontSize: 10, fontWeight: '700' },
  logHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editLogBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, borderColor: '#7c3aed44', backgroundColor: '#7c3aed22', paddingHorizontal: 10, paddingVertical: 7 },
  editLogText: { color: '#c8b8ff', fontSize: 12, fontWeight: '800' },
  collapsedLog: { backgroundColor: '#0d1030', borderRadius: 13, borderWidth: 1, borderColor: '#1f254f', overflow: 'hidden' },
  collapsedItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  collapsedLabel: { color: '#8c91b5', fontSize: 12, fontWeight: '700' },
  collapsedValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  collapsedDivider: { height: 1, backgroundColor: '#1f254f' },

  bars:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 90, marginBottom: 12 },
  barCol:   { alignItems: 'center', flex: 1 },
  barTrack: { width: '65%', height: 76, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: '#0d1030' },
  barFill:  { width: '100%', borderRadius: 4, position: 'absolute', bottom: 0 },
  barLabel: { color: '#4a5270', fontSize: 8, marginTop: 4, fontWeight: '600' },

  statsRow:    { gap: 6 },
  statPill:    { backgroundColor: '#00c9b111', borderRadius: 9, paddingVertical: 7, paddingHorizontal: 11, borderWidth: 1, borderColor: '#00c9b133' },
  statPillText:{ color: '#6c7094', fontSize: 11, textAlign: 'center' },
  weekPill:    { marginTop: 8, backgroundColor: '#7c3aed11', borderColor: '#7c3aed33' },
  sourceHint:  { color: '#ffb830', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 8 },

  fieldLabel:  { color: '#8c91b5', fontSize: 11, fontWeight: '600', marginBottom: 7 },
  timeCard:    { backgroundColor: '#0d1030', borderRadius: 12, borderWidth: 1.5, borderColor: '#7c3aed44', paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wakeTimeCard:{ borderColor: '#fcd53f44' },
  timeCardVal: { color: '#fff', fontSize: 22, fontWeight: '800' },

  durRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#0d1030', borderRadius: 10, padding: 10 },
  durLabel:{ color: '#6c7094', fontSize: 11 },
  durVal:  { color: '#7c3aed', fontSize: 14, fontWeight: '800' },

  qualityScale: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d1030', borderRadius: 12, borderWidth: 1, borderColor: '#1f254f', padding: 8 },
  qualityValueWrap: { alignItems: 'center' },
  qualityValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  qualityRange: { color: '#6c7094', fontSize: 10, fontWeight: '700', marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d1030', borderRadius: 12, borderWidth: 1, borderColor: '#1f254f', padding: 8 },
  stepperBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#7c3aed22', borderWidth: 1, borderColor: '#7c3aed44', alignItems: 'center', justifyContent: 'center' },
  stepperVal: { color: '#fff', fontSize: 20, fontWeight: '800' },

  saveBtn:    { backgroundColor: '#7c3aed', borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 10 },
  saveBtnOk:  { backgroundColor: '#00c9b1' },
  saveBtnText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  hint:       { color: '#4a5270', fontSize: 10, textAlign: 'center', lineHeight: 16 },

  comingSoonCard: { backgroundColor: '#0e1228', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#7c3aed33' },
  comingSoonTitle:{ color: '#7c3aed', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  comingSoonBody: { color: '#4a5270', fontSize: 11, lineHeight: 17 },

  navWrap:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#030A31', borderTopWidth: 1, borderTopColor: '#1f254f' },
  nav:       { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  navItem:   { alignItems: 'center', width: 64 },
  navBadge: { position: 'absolute', top: -5, right: 13, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#ff5c5c', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 2 },
  navBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  navLabel:  { color: '#6c7094', fontSize: 10, marginTop: 4, fontWeight: '600' },
  navLabelDisabled: { color: '#3a4060' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#8a52f3', position: 'absolute', bottom: -8 },

  // Time picker modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  pickerBox:    { backgroundColor: '#161b3d', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28 },
  pickerHandle: { width: 40, height: 4, backgroundColor: '#2a3060', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1f254f' },
  pickerTitle:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  doneBtn:      { backgroundColor: '#7c3aed', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6 },
  doneBtnText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  clockHeaderRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14 },
  clockTab:       { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#1f254f', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1030' },
  clockTabOn:     { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  clockTabText:   { color: '#6c7094', fontSize: 13, fontWeight: '700' },
  clockTabTextOn: { color: '#fff' },
  clockFace:      { width: 260, height: 260, borderRadius: 130, backgroundColor: '#0d1030', borderWidth: 1, borderColor: '#1f254f', alignSelf: 'center', marginTop: 16 },
  clockNumber:    { position: 'absolute', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  clockNumberOn:  { backgroundColor: '#7c3aed' },
  clockNumberText:{ color: '#8c91b5', fontSize: 13, fontWeight: '800' },
  clockNumberTextOn: { color: '#fff' },
  clockHandLayer: { position: 'absolute', left: 0, top: 0, zIndex: 1 },
  clockCenter:    { position: 'absolute', left: 124, top: 124, width: 12, height: 12, borderRadius: 6, backgroundColor: '#7c3aed', zIndex: 3 },
  pickerBody:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  drumWrap:     { flex: 1, alignItems: 'center' },
  drumLabel:    { color: '#4a5270', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  colon:        { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 18, paddingHorizontal: 8 },
  ampmCol:      { alignItems: 'center', gap: 8, marginTop: 18, marginLeft: 10 },
  ampmRow:      { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  apBtn:        { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: '#1f254f', backgroundColor: '#0d1030' },
  apBtnOn:      { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  apText:       { color: '#6c7094', fontSize: 13, fontWeight: '700' },
  apTextOn:     { color: '#fff' },
  previewRow:   { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1f254f', marginTop: 8, marginHorizontal: 20 },
  previewText:  { color: '#7c3aed', fontSize: 26, fontWeight: '800', letterSpacing: 2 },
});
