import { useTheme, useThemedStyles } from '../theme/designTheme';
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, Image, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import StepIndicator from '../components/StepIndicator';
import { useOnboarding } from '../context/OnboardingContext';

const ITEM_H = 44;

function DrumWheel({ items, selected, onSelect, labelFn }) {
  const { colors } = useTheme();

  const scrollRef = useRef(null);
  const settleTimerRef = useRef(null);
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

  useEffect(() => () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
  }, []);

  function selectNearest(e) {
    const y = e.nativeEvent.contentOffset.y;
    const absoluteIndex = Math.max(0, Math.min(tripled.length - 1, Math.round(y / ITEM_H)));
    const idx = absoluteIndex % items.length;
    setCenteredIndex(absoluteIndex);
    onSelect(items[(idx + items.length) % items.length]);
  }

  function scheduleNearestSelection(e) {
    const offsetY = e.nativeEvent.contentOffset.y;
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      selectNearest({ nativeEvent: { contentOffset: { y: offsetY } } });
    }, 120);
  }

  function finishMomentum(e) {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    selectNearest(e);
  }

  return (
    <View style={{ flex: 1, height: ITEM_H * 5, overflow: 'hidden', position: 'relative' }}>
      <View style={{ position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.accent + '55', backgroundColor: colors.accent + '0a', zIndex: 1, pointerEvents: 'none' }} />
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
        onScroll={scheduleNearestSelection}
        onMomentumScrollEnd={finishMomentum}
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
              onPress={() => {
                setCenteredIndex(i);
                onSelect(v);
              }}
              activeOpacity={0.7}
            >
              <Text style={{fontFamily:'Lexend_400Regular', color: isSel ? colors.text : colors.muted, fontSize: isSel ? 20 : 16, fontWeight: isSel ? '800' : '500' }}>
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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

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

  const heightMeters = (unit === 'kg' ? Number(heightCm) : (Number(heightFt) * 12 + Number(heightIn || 0)) * 2.54) / 100;
  const bmi = heightMeters > 0 && Number(weight) > 0 ? (unit === 'kg' ? Number(weight) : Number(weight) * 0.453592) / (heightMeters * heightMeters) : null;
  const bmiLabel = bmi == null ? '' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy weight' : bmi < 30 ? 'Overweight' : 'Obese';
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
          <LinearGradient colors={[colors.background, colors.background]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }} />
          <View style={styles.imgWrap}>
            <Image source={require('../assets/home1.png')} style={styles.heroImg} resizeMode="cover" />
            <LinearGradient colors={['transparent', colors.background]} style={styles.imgOverlay} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="chevron-left" size={28} color={colors.secondary} />
            </TouchableOpacity>
            <StepIndicator currentStep={3} totalSteps={5} />
          </View>

          <ScrollView
            ref={formScrollRef}
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            scrollEnabled
          >
            <Text style={styles.title}>Tell us about you</Text>
            <Text style={styles.sub}>Used to calculate your BMI and factors.</Text>

            {/* Unit toggle */}

            <View style={styles.toggle}>
              <TouchableOpacity style={[styles.toggleBtn, unit === 'lbs' && styles.toggleBtnOn]} onPress={() => toggleUnit('lbs')}>
                <Text style={[styles.toggleText, unit === 'lbs' && styles.toggleTextOn]}>ft / lbs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, unit === 'kg' && styles.toggleBtnOn]} onPress={() => toggleUnit('kg')}>
                <Text style={[styles.toggleText, unit === 'kg' && styles.toggleTextOn]}>cm / kg</Text>
              </TouchableOpacity>
            </View>

            {/* Age */}
            <TouchableOpacity style={styles.field} onPress={() => openPicker('age')} activeOpacity={0.8}><Text style={styles.label}>Age</Text>
              <Text style={[styles.fieldVal, !age && styles.placeholder]}>{displayAge}</Text>

            </TouchableOpacity>
            {renderInlinePicker('age')}

            {/* Height */}
            <TouchableOpacity style={styles.field} onPress={() => openPicker('height')} activeOpacity={0.8}><Text style={styles.label}>Height</Text>
              <Text style={[styles.fieldVal, !heightCm && !heightFt && styles.placeholder]}>{displayHeight}</Text>

            </TouchableOpacity>
            {renderInlinePicker('height')}

            {/* Weight */}
            <TouchableOpacity style={styles.field} onPress={() => openPicker('weight')} activeOpacity={0.8}><Text style={styles.label}>Weight</Text>
              <Text style={[styles.fieldVal, !weight && styles.placeholder]}>{displayWeight}</Text>

            </TouchableOpacity>
            {renderInlinePicker('weight')}
            {bmi != null && <View style={{flexDirection:'row',gap:12,padding:16,borderRadius:14,backgroundColor:bmi>=18.5&&bmi<25?colors.successSurface:colors.warningSurface,alignItems:'center'}}><Text style={{fontFamily:'Lexend_700Bold',fontSize:12,color:bmi>=18.5&&bmi<25?colors.successText:colors.warningStrong}}>BMI</Text><Text style={{fontFamily:'Lexend_800ExtraBold',fontSize:18,color:bmi>=18.5&&bmi<25?colors.successText:colors.warningStrong}}>{bmi.toFixed(1)}</Text><Text style={{fontFamily:'Lexend_400Regular',fontSize:13,color:bmi>=18.5&&bmi<25?colors.successText:colors.warningStrong}}>· {bmiLabel}</Text></View>}
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

const createStyles = (colors) => StyleSheet.create({
  safeTop:   { flex: 0, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom:{ flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  imgWrap:   {display:'none'},
  heroImg:   { width: '100%', height: '100%', opacity: 0.9 },
  imgOverlay:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header:    {flexDirection:'row',alignItems:'center',gap:12,paddingTop:16,paddingBottom:20},
  backBtn:   {width:44,height:44,alignItems:'center',justifyContent:'center'},
  content:   {flex:1},
  contentInner: {paddingBottom:20},
  title:     {color:colors.text,fontSize:26,fontFamily:'Lexend_800ExtraBold',lineHeight:31.2,marginBottom:6,textAlign:'left'},
  sub:       {color:colors.secondary,fontSize:14,fontFamily:'Lexend_400Regular',marginBottom:22,lineHeight:21},
  label:     {color:colors.secondary,fontSize:15,fontFamily:'Lexend_600SemiBold',flexShrink:1},
  field:     {backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,minHeight:64,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:14,paddingHorizontal:18,marginBottom:12,gap:8},
  fieldVal:  {color:colors.text,fontSize:20,fontFamily:'Lexend_800ExtraBold',textAlign:'right',flexShrink:1},
  placeholder:{fontFamily:'Lexend_400Regular', color: colors.muted, fontSize: 16 },
  toggle:    {flexDirection:'row',gap:8,backgroundColor:colors.segmentSurface,borderRadius:14,padding:4,marginBottom:22},
  toggleBtn: {flex:1,minHeight:44,borderRadius:11,alignItems:'center',justifyContent:'center'},
  toggleBtnOn: {backgroundColor:colors.surface},
  toggleText:  {color:colors.secondary,fontSize:14,fontFamily:'Lexend_700Bold'},
  toggleTextOn:{color:colors.text},

  bottom:    {paddingTop:20,paddingBottom:20},
  nextBtn:   {backgroundColor:colors.brand,minHeight:56,borderRadius:16,alignItems:'center',justifyContent:'center'},
  nextBtnOff:{ opacity: 0.5 },
  nextBtnText:{color:colors.onBrand,fontSize:18,fontFamily:'Lexend_700Bold'},
  inlinePicker:{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.accent + '44', marginTop: -8, marginBottom: 14, overflow: 'hidden', maxHeight: 300 },
  inlinePickerHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerTitle: { color: colors.text, fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  doneBtn:     { backgroundColor: colors.brand, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 },
  doneBtnText: { color: colors.onBrand, fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  pickerBody:  { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8 },
  drumSep:     { width: 20, alignItems: 'center', justifyContent: 'center' },

});
