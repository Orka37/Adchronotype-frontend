import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, Image, Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Line } from 'react-native-svg';
import StepIndicator from '../components/StepIndicator';
import { useOnboarding } from '../context/OnboardingContext';

const HOURS   = [1,2,3,4,5,6,7,8,9,10,11,12];
const MINUTES = [0,30];
const ITEM_H  = 48;

function clockAngleForValue(value, mode) {
  const clockPosition = mode === 'hour' ? value % 12 : value / 5;
  return (clockPosition / 12) * Math.PI * 2 - Math.PI / 2;
}

function roundToHalfHour(date) {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();

  if (minutes <= 15) {
    rounded.setMinutes(0, 0, 0);
  } else if (minutes < 45) {
    rounded.setMinutes(30, 0, 0);
  } else {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  }

  return rounded;
}

// Drum scroll wheel — infinite looping feel using tripled array
function DrumWheel({ items, selected, onSelect }) {
  const scrollRef = useRef(null);
  const tripled   = [...items, ...items, ...items];
  const midOffset = items.length * ITEM_H;

  // on mount and when selected changes scroll to center
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx < 0 || !scrollRef.current) return;
    scrollRef.current.scrollTo({ y: midOffset + idx * ITEM_H - ITEM_H * 2, animated: false });
  }, [selected]);

  function onMomentumEnd(e) {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H) % items.length;
    const real = (idx + items.length) % items.length;
    onSelect(items[real]);
  }

  return (
    <View style={drum.wrap}>
      <View style={drum.hl} pointerEvents="none" />
      <View style={drum.fadeTop} pointerEvents="none" />
      <View style={drum.fadeBottom} pointerEvents="none" />
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
              style={[drum.item, isSel && drum.itemSel]}
              onPress={() => onSelect(v)}
              activeOpacity={0.7}
            >
              <Text style={[drum.label, isSel && drum.labelSel]}>
                {String(v).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const drum = StyleSheet.create({
  wrap:       { flex: 1, height: ITEM_H * 5, overflow: 'hidden', position: 'relative' },
  item:       { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemSel:    { backgroundColor: 'transparent' },
  label:      { color: '#4a5270', fontSize: 20, fontWeight: '600' },
  labelSel:   { color: '#ffffff', fontSize: 26, fontWeight: '800' },
  hl:         { position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#7c3aed55', backgroundColor: '#7c3aed0a', zIndex: 1, pointerEvents: 'none' },
  fadeTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 2, backgroundColor: 'transparent', zIndex: 2 },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 2, backgroundColor: 'transparent', zIndex: 2 },
});

export default function SleepTimeScreen({ navigation }) {
  const defaultBed  = new Date(); defaultBed.setHours(22, 0, 0, 0);
  const defaultWake = new Date(); defaultWake.setHours(6, 30, 0, 0);

  const { bedTime, setBedTime, wakeTime, setWakeTime } = useOnboarding();

  const [showPicker,  setShowPicker]  = useState(false);
  const [pickerMode,  setPickerMode]  = useState('bed');
  const [pickerStep,  setPickerStep]  = useState('hour');

  // picker state
  const [selH,  setSelH]  = useState(10);
  const [selM,  setSelM]  = useState(0);
  const [selAP, setSelAP] = useState('PM');

  function openPicker(mode) {
    setPickerMode(mode);
    const src = roundToHalfHour(mode === 'bed' ? (bedTime || defaultBed) : (wakeTime || defaultWake));
    let h = src.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const m = src.getMinutes();
    setSelH(h); setSelM(m); setSelAP(ap);
    setPickerStep('hour');
    setShowPicker(true);
  }

  function confirmPicker() {
    let h24 = selH % 12 + (selAP === 'PM' ? 12 : 0);
    const d = new Date();
    d.setHours(h24, selM, 0, 0);
    if (pickerMode === 'bed') setBedTime(d);
    else setWakeTime(d);
    setShowPicker(false);
  }

  function fmt(date) {
    if (!date) return 'Tap to set';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function calcDuration() {
    if (!bedTime || !wakeTime) return null;
    let diff = wakeTime.getTime() - bedTime.getTime();
    if (diff < 0) diff += 86400000;
    return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000) };
  }

  const dur = calcDuration();
  const valid = bedTime && wakeTime;
  const clockItems = pickerStep === 'hour' ? HOURS : MINUTES;
  const selectedClockValue = pickerStep === 'hour' ? selH : selM;
  const handAngle = clockAngleForValue(selectedClockValue, pickerStep);
  const handEndX = 130 + Math.cos(handAngle) * 104;
  const handEndY = 130 + Math.sin(handAngle) * 104;

  return (
    <>
      <SafeAreaView style={styles.safeAreaTop} />
      <SafeAreaView style={styles.safeAreaBottom}>
        <View style={styles.container}>
          <LinearGradient colors={['#030827', '#030A31']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }} />
          <View style={styles.imageContainer}>
            <Image source={require('../assets/home1.png')} style={styles.heroImage} resizeMode="cover" />
            <LinearGradient colors={['transparent', '#030A31']} style={styles.imageOverlay} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="chevron-left" size={28} color="#ffffff" />
            </TouchableOpacity>
            <StepIndicator currentStep={2} totalSteps={5} />
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.contentWrapper}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>When do you usually sleep?</Text>
              <Text style={styles.subtitle}>Tap a card to select your time.</Text>
            </View>

            <View style={styles.inputsContainer}>
              {/* Bedtime card */}
              <TouchableOpacity style={styles.timeCard} onPress={() => openPicker('bed')} activeOpacity={0.8}>
                <View style={styles.timeCardLeft}>
                  <Feather name="moon" size={22} color="#8a52f3" />
                  <View style={styles.timeCardText}>
                    <Text style={styles.timeCardLabel}>Bedtime</Text>
                    <Text style={[styles.timeCardValue, !bedTime && styles.placeholder]}>
                      {fmt(bedTime)}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-down" size={20} color="#6c7094" />
              </TouchableOpacity>

              {/* Wake-up card */}
              <TouchableOpacity style={[styles.timeCard, styles.wakeCard]} onPress={() => openPicker('wake')} activeOpacity={0.8}>
                <View style={styles.timeCardLeft}>
                  <Feather name="sun" size={22} color="#fcd53f" />
                  <View style={styles.timeCardText}>
                    <Text style={styles.timeCardLabel}>Wake-up Time</Text>
                    <Text style={[styles.timeCardValue, !wakeTime && styles.placeholder]}>
                      {fmt(wakeTime)}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-down" size={20} color="#6c7094" />
              </TouchableOpacity>

              {/* Duration summary */}
              <View style={styles.summaryBox}>
                <Feather name="clock" size={22} color="#8a52f3" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.summaryLabel}>You sleep about</Text>
                  <Text style={styles.summaryValue}>
                    {dur ? `${dur.h}h ${dur.m}m` : '— h — m'}{' '}
                    <Text style={styles.summaryLabel}>per day</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[styles.nextButton, !valid && styles.nextButtonDisabled]}
              disabled={!valid}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('UserInfo')}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Custom time picker modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowPicker(false)} />
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerMode === 'bed' ? '🌙  Set Bedtime' : '☀️  Set Wake-up Time'}
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
              {clockItems.map((item, index) => {
                const angle = clockAngleForValue(item, pickerStep);
                const radius = 104;
                const left = 130 + Math.cos(angle) * radius - 20;
                const top = 130 + Math.sin(angle) * radius - 20;
                const selected = pickerStep === 'hour' ? item === selH : item === selM;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.clockNumber, { left, top }, selected && styles.clockNumberOn]}
                    onPress={() => pickerStep === 'hour' ? setSelH(item) : setSelM(item)}
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

            {/* Live preview */}
            <View style={styles.previewRow}>
              <Text style={styles.previewText}>
                {String(selH).padStart(2,'0')}:{String(selM).padStart(2,'0')} {selAP}
              </Text>
            </View>
            <View style={styles.ampmRow}>
              {['AM','PM'].map(ap => (
                <TouchableOpacity
                  key={ap}
                  style={[styles.ampmBtn, selAP === ap && styles.ampmBtnActive]}
                  onPress={() => setSelAP(ap)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.ampmText, selAP === ap && styles.ampmTextActive]}>{ap}</Text>
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
  safeAreaTop:    { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeAreaBottom: { flex: 1, backgroundColor: '#030A31' },
  container:      { flex: 1, backgroundColor: '#030A31', paddingHorizontal: 20 },
  imageContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: -1 },
  heroImage:      { width: '100%', height: '100%', opacity: 0.9 },
  imageOverlay:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  backButton:     { padding: 4 },
  contentWrapper: { flex: 1, paddingTop: 24 },
  textContainer:  { alignItems: 'center', marginBottom: 32 },
  title:          { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', lineHeight: 36, marginBottom: 10 },
  subtitle:       { fontSize: 15, color: '#e0e0e0', textAlign: 'center' },
  inputsContainer:{ gap: 14 },

  timeCard:      { backgroundColor: '#161b3d', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#7c3aed44' },
  wakeCard:      { borderColor: '#fcd53f44' },
  timeCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  timeCardText:  {},
  timeCardLabel: { color: '#6c7094', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  timeCardValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  placeholder:   { color: '#4a5270', fontSize: 18 },

  summaryBox:    { backgroundColor: '#161b3d', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1f254f' },
  summaryLabel:  { color: '#6c7094', fontSize: 12 },
  summaryValue:  { color: '#fff', fontSize: 20, fontWeight: '700' },

  bottomContainer:    { marginBottom: 20, marginTop: 16 },
  nextButton:         { backgroundColor: '#8a52f3', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText:     { color: '#fff', fontSize: 18, fontWeight: '600' },

  // Picker modal
  modalOverlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  pickerContainer:{ backgroundColor: '#161b3d', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30 },
  pickerHandle:   { width: 40, height: 4, backgroundColor: '#2a3060', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  pickerHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f254f' },
  pickerTitle:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBtn:        { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  doneBtnText:    { color: '#fff', fontSize: 13, fontWeight: '700' },

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

  ampmRow:        { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  ampmBtn:        { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#1f254f', backgroundColor: '#0d1030' },
  ampmBtnActive:  { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  ampmText:       { color: '#6c7094', fontSize: 14, fontWeight: '700' },
  ampmTextActive: { color: '#fff' },

  previewRow:  { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f254f', marginTop: 8, marginHorizontal: 20 },
  previewText: { color: '#7c3aed', fontSize: 28, fontWeight: '800', letterSpacing: 2 },
});
