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
  label:      { color: '#B09A86', fontSize: 20, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },
  labelSel:   { color: '#3D2B1F', fontSize: 26, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  hl:         { position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#E07B3C55', backgroundColor: '#E07B3C0a', zIndex: 1, pointerEvents: 'none' },
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
          <LinearGradient colors={['#FDF6F0', '#FDF6F0']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }} />
          <View style={styles.imageContainer}>
            <Image source={require('../assets/home1.png')} style={styles.heroImage} resizeMode="cover" />
            <LinearGradient colors={['transparent', '#FDF6F0']} style={styles.imageOverlay} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="chevron-left" size={28} color="#8A6A4E" />
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
                  <Feather name="moon" size={22} color="#F0955A" />
                  <View style={styles.timeCardText}>
                    <Text style={styles.timeCardLabel}>Bedtime</Text>
                    <Text style={[styles.timeCardValue, !bedTime && styles.placeholder]}>
                      {fmt(bedTime)}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-down" size={20} color="#8A6A4E" />
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
                <Feather name="chevron-down" size={20} color="#8A6A4E" />
              </TouchableOpacity>

              {/* Duration summary */}
              <View style={styles.summaryBox}>
                <Feather name="clock" size={22} color="#F0955A" />
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
                <Line x1={130} y1={130} x2={handEndX} y2={handEndY} stroke="#E07B3C" strokeWidth={4} strokeLinecap="round" />
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
  safeAreaTop:    { flex: 0, backgroundColor: '#FDF6F0', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeAreaBottom: { flex: 1, backgroundColor: '#FDF6F0' },
  container:      { flex: 1, backgroundColor: '#FDF6F0', paddingHorizontal: 20 },
  imageContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: -1 },
  heroImage:      { width: '100%', height: '100%', opacity: 0.9 },
  imageOverlay:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  backButton:     { padding: 4 },
  contentWrapper: { flex: 1, paddingTop: 24 },
  textContainer:  { alignItems: 'center', marginBottom: 32 },
  title:          { fontSize: 28, fontFamily: 'Lexend_700Bold', fontWeight: 'normal', color: '#3D2B1F', textAlign: 'center', lineHeight: 36, marginBottom: 10 },
  subtitle:       { fontSize: 15, color: '#8A6A4E', textAlign: 'center' },
  inputsContainer:{ gap: 14 },

  timeCard:      { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#E07B3C44' },
  wakeCard:      { borderColor: '#fcd53f44' },
  timeCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  timeCardText:  {},
  timeCardLabel: { color: '#8A6A4E', fontSize: 11, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal', marginBottom: 4 },
  timeCardValue: { color: '#3D2B1F', fontSize: 24, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  placeholder:   { color: '#B09A86', fontSize: 18 },

  summaryBox:    { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F0E2D4' },
  summaryLabel:  { color: '#8A6A4E', fontSize: 12 },
  summaryValue:  { color: '#3D2B1F', fontSize: 20, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },

  bottomContainer:    { marginBottom: 20, marginTop: 16 },
  nextButton:         { backgroundColor: '#F0955A', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText:     { color: '#fff', fontSize: 18, fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal' },

  // Picker modal
  modalOverlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  pickerContainer:{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30 },
  pickerHandle:   { width: 40, height: 4, backgroundColor: '#D8C6B5', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  pickerHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0E2D4' },
  pickerTitle:    { color: '#3D2B1F', fontSize: 15, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  doneBtn:        { backgroundColor: '#E07B3C', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  doneBtnText:    { color: '#fff', fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },

  clockHeaderRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14 },
  clockTab:       { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#F0E2D4', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF6F0' },
  clockTabOn:     { backgroundColor: '#E07B3C', borderColor: '#E07B3C' },
  clockTabText:   { color: '#8A6A4E', fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  clockTabTextOn: { color: '#fff' },
  clockFace:      { width: 260, height: 260, borderRadius: 130, backgroundColor: '#FDF6F0', borderWidth: 1, borderColor: '#F0E2D4', alignSelf: 'center', marginTop: 16 },
  clockNumber:    { position: 'absolute', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  clockNumberOn:  { backgroundColor: '#E07B3C' },
  clockNumberText:{ color: '#8A6A4E', fontSize: 13, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  clockNumberTextOn: { color: '#fff' },
  clockHandLayer: { position: 'absolute', left: 0, top: 0, zIndex: 1 },
  clockCenter:    { position: 'absolute', left: 124, top: 124, width: 12, height: 12, borderRadius: 6, backgroundColor: '#E07B3C', zIndex: 3 },

  ampmRow:        { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  ampmBtn:        { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#F0E2D4', backgroundColor: '#FDF6F0' },
  ampmBtnActive:  { backgroundColor: '#E07B3C', borderColor: '#E07B3C' },
  ampmText:       { color: '#8A6A4E', fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  ampmTextActive: { color: '#fff' },

  previewRow:  { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0E2D4', marginTop: 8, marginHorizontal: 20 },
  previewText: { color: '#E07B3C', fontSize: 28, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', letterSpacing: 2 },
});
