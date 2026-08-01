import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, Image, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import StepIndicator from '../components/StepIndicator';
import { useOnboarding } from '../context/OnboardingContext';

const ITEM_H = 44;

function DrumWheel({ items, selected, onSelect, labelFn }) {
  const scrollRef = useRef(null);
  const [centeredIndex, setCenteredIndex] = useState(() => {
    const idx = items.indexOf(selected);
    return items.length + (idx >= 0 ? idx : 0);
  });
  const label = labelFn || (v => String(v));
  const tripled = [...items, ...items, ...items];

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0 && scrollRef.current) {
      const nextIndex = items.length + idx;
      setCenteredIndex(nextIndex);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: items.length * ITEM_H + idx * ITEM_H,
          animated: false,
        });
      });
    }
  }, [items, selected]);

  function selectNearest(e) {
    const y = e.nativeEvent.contentOffset.y;
    const absoluteIndex = Math.max(0, Math.min(tripled.length - 1, Math.round(y / ITEM_H)));
    const idx = absoluteIndex % items.length;
    setCenteredIndex(absoluteIndex);
    onSelect(items[(idx + items.length) % items.length]);
  }

  return (
    <View style={{ flex: 1, height: ITEM_H * 5, overflow: 'hidden', position: 'relative' }}>
      <View style={{ position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#7c3aed55', backgroundColor: '#7c3aed0a', zIndex: 1, pointerEvents: 'none' }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 2, zIndex: 2, pointerEvents: 'none' }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 2, zIndex: 2, pointerEvents: 'none' }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEventThrottle={16}
        snapToInterval={ITEM_H}
        snapToAlignment="center"
        decelerationRate="fast"
        onMomentumScrollEnd={selectNearest}
        onScrollEndDrag={selectNearest}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        keyboardShouldPersistTaps="handled"
        style={{ height: ITEM_H * 5 }}
      >
        {tripled.map((v, i) => {
          const isSel = i === centeredIndex;
          return (
            <TouchableOpacity
              key={`${v}-${i}`}
              style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => onSelect(v)}
              activeOpacity={0.7}
            >
              <Text style={{ color: isSel ? '#fff' : '#4a5270', fontSize: isSel ? 20 : 16, fontWeight: isSel ? '800' : '500' }}>
                {label(v)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const MIN_AGE = 40;
const MAX_AGE = 60;
const AGES    = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => i + MIN_AGE);
const CMS     = Array.from({ length: 101 }, (_, i) => i + 120);  // 120–220 cm
const FEET    = [4, 5, 6, 7];
const INCHES  = Array.from({ length: 12 }, (_, i) => i);
const KGS     = Array.from({ length: 151 }, (_, i) => i + 30);   // 30–180 kg
const LBS_ARR = Array.from({ length: 301 }, (_, i) => i + 66);   // 66–366 lbs

function clampAge(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return MIN_AGE;
  return Math.min(MAX_AGE, Math.max(MIN_AGE, parsed));
}

export default function UserInfoScreen({ navigation }) {
  const {
    age, setAge,
    heightFt, setHeightFt,
    heightIn, setHeightIn,
    heightCm, setHeightCm,
    weight, setWeight,
    unit, setUnit,
  } = useOnboarding();

  const [activePicker, setActivePicker] = useState(null);
  const formScrollRef = useRef(null);

  // local picker state (confirmed on Done)
  const [tmpAge,    setTmpAge]    = useState(MIN_AGE);
  const [tmpCm,     setTmpCm]     = useState(160);
  const [tmpFt,     setTmpFt]     = useState(5);
  const [tmpIn,     setTmpIn]     = useState(3);
  const [tmpWeight, setTmpWeight] = useState(60);

  useEffect(() => {
    if (!age) return;
    const safeAge = clampAge(age);
    if (String(safeAge) !== String(age)) {
      setAge(String(safeAge));
    }
  }, [age, setAge]);

  function openPicker(type) {
    if (type === 'age')    setTmpAge(age ? clampAge(age) : MIN_AGE);
    if (type === 'height') { setTmpCm(heightCm ? parseInt(heightCm) : 160); setTmpFt(heightFt ? parseInt(heightFt) : 5); setTmpIn(heightIn ? parseInt(heightIn) : 3); }
    if (type === 'weight') setTmpWeight(weight ? parseInt(weight) : (unit === 'kg' ? 60 : 132));
    setActivePicker(type);
    if (type === 'weight') {
      requestAnimationFrame(() => {
        formScrollRef.current?.scrollToEnd({ animated: true });
      });
    }
  }

  function confirmPicker() {
    if (activePicker === 'age')    setAge(String(tmpAge));
    if (activePicker === 'height') { setHeightCm(String(tmpCm)); setHeightFt(String(tmpFt)); setHeightIn(String(tmpIn)); }
    if (activePicker === 'weight') setWeight(String(tmpWeight));
    setActivePicker(null);
  }

  function toggleUnit(newUnit) {
    if (newUnit === unit) return;
    setActivePicker(null);
    if (newUnit === 'kg') {
      if (weight) setWeight(String(Math.round(parseInt(weight) * 0.453592)));
      if (heightFt) { const cm = Math.round(((parseInt(heightFt) * 12) + parseInt(heightIn || 0)) * 2.54); setHeightCm(String(cm)); }
    } else {
      if (weight) setWeight(String(Math.round(parseInt(weight) * 2.20462)));
      if (heightCm) {
        const totalInches = Math.round(parseInt(heightCm) / 2.54);
        setHeightFt(String(Math.floor(totalInches / 12)));
        setHeightIn(String(totalInches % 12));
      }
    }
    setUnit(newUnit);
  }

  const displayHeight = unit === 'kg'
    ? (heightCm ? `${heightCm} cm` : 'Tap to select')
    : (heightFt ? `${heightFt} ft  ${heightIn || 0} in` : 'Tap to select');

  const displayWeight = weight ? `${weight} ${unit}` : 'Tap to select';
  const displayAge    = age || 'Tap to select';

  const isFormValid = age && weight && (unit === 'lbs' ? (heightFt && heightIn) : heightCm);

  const PICKER_TITLE = { age: 'Select Age', height: unit === 'kg' ? 'Select Height (cm)' : 'Select Height (ft / in)', weight: `Select Weight (${unit})` };

  function renderInlinePicker(type) {
    if (activePicker !== type) return null;

    return (
      <View style={styles.inlinePicker}>
        <View style={styles.inlinePickerHeader}>
          <Text style={styles.pickerTitle}>{PICKER_TITLE[activePicker] || ''}</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={confirmPicker}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.pickerBody}>
          {activePicker === 'age' && (
            <DrumWheel items={AGES} selected={tmpAge} onSelect={setTmpAge} />
          )}
          {activePicker === 'height' && unit === 'kg' && (
            <DrumWheel items={CMS} selected={tmpCm} onSelect={setTmpCm} labelFn={v => `${v} cm`} />
          )}
          {activePicker === 'height' && unit === 'lbs' && (
            <>
              <DrumWheel items={FEET} selected={tmpFt} onSelect={setTmpFt} labelFn={v => `${v} ft`} />
              <View style={styles.drumSep} />
              <DrumWheel items={INCHES} selected={tmpIn} onSelect={setTmpIn} labelFn={v => `${v} in`} />
            </>
          )}
          {activePicker === 'weight' && unit === 'kg' && (
            <DrumWheel items={KGS} selected={tmpWeight} onSelect={setTmpWeight} labelFn={v => `${v} kg`} />
          )}
          {activePicker === 'weight' && unit === 'lbs' && (
            <DrumWheel items={LBS_ARR} selected={tmpWeight} onSelect={setTmpWeight} labelFn={v => `${v} lbs`} />
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <SafeAreaView style={styles.safeBottom}>
        <View style={styles.container}>
          <LinearGradient colors={['#030827', '#030A31']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }} />
          <View style={styles.imgWrap}>
            <Image source={require('../assets/home1.png')} style={styles.heroImg} resizeMode="cover" />
            <LinearGradient colors={['transparent', '#030A31']} style={styles.imgOverlay} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="chevron-left" size={28} color="#fff" />
            </TouchableOpacity>
            <StepIndicator currentStep={3} totalSteps={5} />
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            ref={formScrollRef}
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            scrollEnabled
          >
            <Text style={styles.title}>Physical profile</Text>
            <Text style={styles.sub}>Tap any field to change.</Text>

            {/* Age */}
            <Text style={styles.label}>Age</Text>
            <TouchableOpacity style={styles.field} onPress={() => openPicker('age')} activeOpacity={0.8}>
              <Text style={[styles.fieldVal, !age && styles.placeholder]}>{displayAge}</Text>
              <Feather name="chevron-down" size={18} color="#6c7094" />
            </TouchableOpacity>
            {renderInlinePicker('age')}

            {/* Unit toggle */}
            <Text style={styles.label}>Units</Text>
            <View style={styles.toggle}>
              <TouchableOpacity style={[styles.toggleBtn, unit === 'lbs' && styles.toggleBtnOn]} onPress={() => toggleUnit('lbs')}>
                <Text style={[styles.toggleText, unit === 'lbs' && styles.toggleTextOn]}>Freedom units</Text>
                <Text style={[styles.toggleSubText, unit === 'lbs' && styles.toggleSubTextOn]}>ft / in · lbs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, unit === 'kg' && styles.toggleBtnOn]} onPress={() => toggleUnit('kg')}>
                <Text style={[styles.toggleText, unit === 'kg' && styles.toggleTextOn]}>Metric units</Text>
                <Text style={[styles.toggleSubText, unit === 'kg' && styles.toggleSubTextOn]}>cm · kg</Text>
              </TouchableOpacity>
            </View>

            {/* Height */}
            <Text style={styles.label}>Height</Text>
            <TouchableOpacity style={styles.field} onPress={() => openPicker('height')} activeOpacity={0.8}>
              <Text style={[styles.fieldVal, !heightCm && !heightFt && styles.placeholder]}>{displayHeight}</Text>
              <Feather name="chevron-down" size={18} color="#6c7094" />
            </TouchableOpacity>
            {renderInlinePicker('height')}

            {/* Weight */}
            <Text style={styles.label}>Weight</Text>
            <TouchableOpacity style={styles.field} onPress={() => openPicker('weight')} activeOpacity={0.8}>
              <Text style={[styles.fieldVal, !weight && styles.placeholder]}>{displayWeight}</Text>
              <Feather name="chevron-down" size={18} color="#6c7094" />
            </TouchableOpacity>
            {renderInlinePicker('weight')}
          </ScrollView>

          <View style={styles.bottom}>
            <TouchableOpacity
              style={[styles.nextBtn, !isFormValid && styles.nextBtnOff]}
              disabled={!isFormValid}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('BackgroundInfo')}
            >
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

    </>
  );
}

const styles = StyleSheet.create({
  safeTop:   { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom:{ flex: 1, backgroundColor: '#030A31' },
  container: { flex: 1, backgroundColor: '#030A31', paddingHorizontal: 20 },
  imgWrap:   { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: -1 },
  heroImg:   { width: '100%', height: '100%', opacity: 0.9 },
  imgOverlay:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  backBtn:   { padding: 4 },
  content:   { flex: 1 },
  contentInner: { paddingTop: 20, paddingBottom: 140 },
  title:     { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub:       { color: '#6c7094', fontSize: 13, marginBottom: 20 },
  label:     { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  field:     { backgroundColor: '#161b3d', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#1f254f' },
  fieldVal:  { color: '#fff', fontSize: 18, fontWeight: '700' },
  placeholder:{ color: '#4a5270', fontSize: 16 },
  toggle:    { flexDirection: 'row', backgroundColor: '#1a1f40', borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 },
  toggleBtn: { flex: 1, minHeight: 54, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  toggleBtnOn: { backgroundColor: '#7c3aed' },
  toggleText:  { color: '#6c7094', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  toggleTextOn:{ color: '#fff' },
  toggleSubText: { color: '#4a5270', fontSize: 10, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  toggleSubTextOn: { color: '#d8ccff' },
  bottom:    { marginBottom: 20, marginTop: 12 },
  nextBtn:   { backgroundColor: '#8a52f3', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  nextBtnOff:{ opacity: 0.5 },
  nextBtnText:{ color: '#fff', fontSize: 18, fontWeight: '600' },
  inlinePicker:{ backgroundColor: '#101638', borderRadius: 14, borderWidth: 1, borderColor: '#7c3aed44', marginTop: -8, marginBottom: 14, overflow: 'hidden', maxHeight: 300 },
  inlinePickerHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f254f' },
  pickerTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  doneBtn:     { backgroundColor: '#7c3aed', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  pickerBody:  { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8 },
  drumSep:     { width: 20, alignItems: 'center', justifyContent: 'center' },
});
