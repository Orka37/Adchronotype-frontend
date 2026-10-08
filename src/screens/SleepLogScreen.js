import DesignNav from '../components/DesignNav';
import { useTheme, useThemedStyles } from '../theme/designTheme';
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
  const { colors } = useTheme();

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
      <View style={{ position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.accent + '55', backgroundColor: colors.accent + '0a', zIndex: 1 }} pointerEvents="none" />
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
              <Text style={{fontFamily:'Lexend_400Regular', color: isSel ? colors.onBrand : colors.muted, fontSize: isSel ? 22 : 17, fontWeight: isSel ? '800' : '500' }}>
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

export default function SleepLogScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

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
      Alert.alert('Saved locally', `We could not reach the server. ${parseApiError(err)}`);
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
  const todayLog = sleepLogs[toDateKey()];
  const showSleepForm = !todayLog || editingToday;
  let streak = 0;
  const streakDate = new Date();
  if (!sleepLogs[toDateKey(streakDate)]) streakDate.setDate(streakDate.getDate()-1);
  while (sleepLogs[toDateKey(streakDate)]) {streak++;streakDate.setDate(streakDate.getDate()-1);}
  const clockItems = pickerStep === 'hour' ? HOURS : MINUTES;
  const selectedClockValue = pickerStep === 'hour' ? tmpH : tmpM;
  const handAngle = clockAngleForValue(selectedClockValue, pickerStep);
  const handEndX = 130 + Math.cos(handAngle) * 104;
  const handEndY = 130 + Math.sin(handAngle) * 104;

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <View style={styles.safeBottom}>
        <View style={styles.root}>
          <LinearGradient colors={[colors.background, colors.background]} style={StyleSheet.absoluteFillObject} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

            {/* Header */}
<View style={styles.header}><Text style={styles.heading}>Sleep Log</Text><Text style={styles.date}>This Week</Text></View>
<View style={styles.streak}><Feather name="zap" size={26} color={colors.warningStrong}/><View><Text style={styles.streakTitle}>{streak}-day streak</Text><Text style={styles.streakBody}>{loadingLogs?'Loading sleep logs…':streak?'Keep logging your sleep each night':'Save tonight’s sleep to start your streak'}</Text></View></View>
<View style={styles.days}>{weekly.map((day,i)=><View key={day.day} style={{flex:1,alignItems:'center',gap:6}}><Text style={styles.dayLabel}>{day.day}</Text><View style={{width:34,height:34,borderRadius:17,backgroundColor:day.logged?'#5FA77A':i===(new Date().getDay()+6)%7?colors.brand:colors.border,alignItems:'center',justifyContent:'center'}}>{day.logged?<Feather name="check" size={16} color="#FFFFFF"/>:i===(new Date().getDay()+6)%7?<Text style={{color:'#FFFFFF'}}>·</Text>:null}</View></View>)}</View>
<View style={{gap:10}}><View style={styles.logHeaderRow}><Text style={styles.cardTitle}>Tonight</Text>{!showSleepForm&&<TouchableOpacity style={styles.editLogBtn} onPress={editTodayLog}><Text style={styles.editLogText}>Edit</Text></TouchableOpacity>}</View>
{[['bed','moon','Bedtime',showSleepForm?fmt(bedH,bedM,bedAP):todayLog?.bedTime],['wake','sun','Wake time',showSleepForm?fmt(wakeH,wakeM,wakeAP):todayLog?.wakeTime]].map(([key,icon,label,value])=><TouchableOpacity key={key} disabled={!showSleepForm} onPress={()=>openPicker(key)} style={styles.timeCard}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><Feather name={icon} size={22} color={key==='bed'?colors.accent:'#C98A12'}/><Text style={styles.timeLabel}>{label}</Text></View><Text style={styles.timeCardVal}>{value}</Text></TouchableOpacity>)}
<View style={styles.durRow}><Text style={styles.durLabel}>Total sleep</Text><Text style={styles.durVal}>{showSleepForm?calcDuration():todayLog?Math.floor(todayLog.hours)+'h '+Math.round((todayLog.hours%1)*60)+'m':'—'}</Text></View>
</View>
<View style={{gap:8,marginTop:16}}>
  <Text style={styles.fieldLabel}>Sleep Quality</Text>
  <View style={styles.qualityScale}>
    <TouchableOpacity accessibilityLabel="Decrease sleep quality score" disabled={!showSleepForm} style={styles.stepperBtn} onPress={()=>setQualityScore(value=>Math.max(0,value-1))}><Feather name="minus" size={16} color={colors.accent}/></TouchableOpacity>
    <View style={styles.qualityValueWrap}><Text style={styles.qualityValue}>{showSleepForm?qualityScore:todayLog?.qualityScore??'—'}</Text><Text style={styles.qualityRange}>0–21</Text></View>
    <TouchableOpacity accessibilityLabel="Increase sleep quality score" disabled={!showSleepForm} style={styles.stepperBtn} onPress={()=>setQualityScore(value=>Math.min(21,value+1))}><Feather name="plus" size={16} color={colors.accent}/></TouchableOpacity>
  </View>
</View>
<View style={styles.awakeningCard}><Text style={styles.fieldLabel}>Awakenings</Text><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><TouchableOpacity accessibilityLabel="Fewer awakenings" disabled={!showSleepForm} style={styles.stepperBtn} onPress={()=>setAwakenings(v=>Math.max(0,v-1))}><Text style={styles.stepperVal}>−</Text></TouchableOpacity><Text style={styles.stepperVal}>{showSleepForm?awakenings:todayLog?.awakenings??0}</Text><TouchableOpacity accessibilityLabel="More awakenings" disabled={!showSleepForm} style={styles.stepperBtn} onPress={()=>setAwakenings(v=>Math.min(20,v+1))}><Text style={styles.stepperVal}>+</Text></TouchableOpacity></View></View>
{showSleepForm&&<TouchableOpacity disabled={saving} onPress={handleSave} style={styles.saveBtn}>{saving?<ActivityIndicator color={colors.onBrand}/>:<Text style={styles.saveBtnText}>{todayLog?'Update Sleep Log':'Save Sleep Log'}</Text>}</TouchableOpacity>}
<Text style={styles.sourceHint}>{dataSource==='local'?'Showing sleep logs saved on this device.':'Showing sleep logs saved to your account.'}</Text>
            <View style={{height:20}}/>
          </ScrollView>

<DesignNav navigation={navigation} active="SleepLog" badgeCount={caregiverRequestCount}/>
        </View>
      </View>

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
                <Line x1={130} y1={130} x2={handEndX} y2={handEndY} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" />
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

const createStyles = (colors) => StyleSheet.create({
  safeTop:    { flex: 0, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: colors.background },
  root:       { flex: 1 },
  scroll:     {paddingHorizontal:20,paddingTop:16,paddingBottom:20},

  header:  {marginTop:16,marginBottom:16,gap:4},
  heading: {color:colors.text,fontSize:26,fontFamily:'Lexend_800ExtraBold'},
  date:    {color:colors.secondary,fontSize:14,fontFamily:'Lexend_400Regular'},

  cardTitle:{color:colors.text,fontSize:15,fontFamily:'Lexend_800ExtraBold'},

  logHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editLogBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.accent + '44', backgroundColor: colors.accent + '22', paddingHorizontal: 10, paddingVertical: 7 },
  editLogText: { color: colors.accent, fontSize: 12, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },

  sourceHint:  {color:colors.secondary,fontSize:11.5,fontFamily:'Lexend_400Regular',textAlign:'center',marginTop:16},

  fieldLabel:  {color:colors.text,fontSize:14,fontFamily:'Lexend_700Bold'},
  timeCard:    {flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:64,paddingVertical:14,paddingHorizontal:16,borderWidth:1,borderColor:colors.border,borderRadius:16,backgroundColor:colors.surface},

  timeCardVal: {color:colors.text,fontSize:18,fontFamily:'Lexend_800ExtraBold'},

  durRow:  {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12,paddingHorizontal:16,backgroundColor:colors.successSurface,borderRadius:14},
  durLabel:{color:colors.successText,fontSize:13,fontFamily:'Lexend_600SemiBold'},
  durVal:  {color:colors.successText,fontSize:16,fontFamily:'Lexend_800ExtraBold'},

  qualityScale: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 8 },
  qualityValueWrap: { alignItems: 'center' },
  qualityValue: { color: colors.text, fontSize: 22, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  qualityRange: { color: colors.secondary, fontSize: 10, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', marginTop: 2 },

  stepperBtn: {width:40,height:40,borderRadius:20,borderWidth:1.5,borderColor:colors.border,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface},
  stepperVal: {color:colors.text,fontSize:18,fontFamily:'Lexend_800ExtraBold'},

  saveBtn:    {backgroundColor:colors.brand,borderRadius:16,minHeight:54,alignItems:'center',justifyContent:'center',marginTop:16},

  saveBtnText:{color:colors.onBrand,fontSize:16,fontFamily:'Lexend_700Bold'},

  // Time picker modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  pickerBox:    { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28 },
  pickerHandle: { width: 40, height: 4, backgroundColor: colors.handle, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerTitle:  { color: colors.text, fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  doneBtn:      { backgroundColor: colors.brand, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6 },
  doneBtnText:  { color: colors.onBrand, fontSize: 12, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  clockHeaderRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14 },
  clockTab:       { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  clockTabOn:     { backgroundColor: colors.brand, borderColor: colors.accent },
  clockTabText:   { color: colors.secondary, fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  clockTabTextOn: { color: colors.onBrand },
  clockFace:      { width: 260, height: 260, borderRadius: 130, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignSelf: 'center', marginTop: 16 },
  clockNumber:    { position: 'absolute', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  clockNumberOn:  { backgroundColor: colors.brand },
  clockNumberText:{ color: colors.secondary, fontSize: 13, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  clockNumberTextOn: { color: colors.onBrand },
  clockHandLayer: { position: 'absolute', left: 0, top: 0, zIndex: 1 },
  clockCenter:    { position: 'absolute', left: 124, top: 124, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brand, zIndex: 3 },

  ampmRow:      { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  apBtn:        { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  apBtnOn:      { backgroundColor: colors.brand, borderColor: colors.accent },
  apText:       { color: colors.secondary, fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  apTextOn:     { color: colors.onBrand },
  previewRow:   { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, marginHorizontal: 20 },
  previewText:  { color: colors.accent, fontSize: 26, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', letterSpacing: 2 },
awakeningCard: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12,paddingHorizontal:16,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:14,marginTop:16},
timeLabel: {color:colors.secondary,fontSize:14,fontFamily:'Lexend_600SemiBold'},
dayLabel: {color:colors.secondary,fontSize:11,fontFamily:'Lexend_700Bold'},
days: {flexDirection:'row',gap:6,marginBottom:16},
streakBody: {color:colors.warningBody,fontSize:12,fontFamily:'Lexend_400Regular'},
streakTitle: {color:colors.warningStrong,fontSize:17,fontFamily:'Lexend_800ExtraBold'},
streak: {flexDirection:'row',gap:12,alignItems:'center',paddingVertical:14,paddingHorizontal:16,backgroundColor:colors.warningSurface,borderWidth:1,borderColor:colors.warningBorder,borderRadius:16,marginBottom:16},
});
