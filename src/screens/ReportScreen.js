import DesignNav from '../components/DesignNav';
import { useTheme, useThemedStyles } from '../theme/designTheme';
import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  ScrollView, Platform, RefreshControl, Linking, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useOnboarding } from '../context/OnboardingContext';
import { useCaregiverRequestCount } from '../hooks/useCaregiverRequestCount';
import { useAuth } from '../context/AuthContext';
import { log } from '../utils/logger';
import {
  RESEARCH_DISCLAIMER,
  RESEARCH_DISCLAIMER_SHORT,
  RESEARCH_METHODOLOGY,
  RESEARCH_SOURCES,
} from '../constants/researchDisclosure';

function impactLabel(val) {
  const abs = Math.abs(val);
  if (abs >= 10) return { text: 'High Impact', color: '#D9694F', icon: '⚠️' };
  if (abs >= 5)  return { text: 'Moderate Impact', color: '#E9A94A', icon: '⚠️' };
  return { text: 'Low Impact', color: '#7EC49A', icon: '✅' };
}

export default function ReportScreen({ navigation }) {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const styles = useThemedStyles(createStyles);

  const {
    predictionResult, refreshPredictionState,
    heightFt, heightIn, heightCm, weight, unit,
  } = useOnboarding();
  const [refreshing, setRefreshing] = useState(false);
  const [showResearchDetails, setShowResearchDetails] = useState(false);
  const caregiverRequestCount = useCaregiverRequestCount();

  const score      = predictionResult?.prediction ?? 0;
  const similarityLabel = score >= 60 ? 'Higher Similarity' : score >= 30 ? 'Moderate Similarity' : 'Lower Similarity';
  const getHeightCmValue = () => {
    if (unit === 'kg' && heightCm) return Number(heightCm);
    if (heightFt) return Math.round(((Number(heightFt || 0) * 12) + Number(heightIn || 0)) * 2.54);
    return null;
  };
  const getWeightKgValue = () => {
    if (!weight) return null;
    return unit === 'kg' ? Number(weight) : Number(weight) * 0.453592;
  };
  const localHeightCm = getHeightCmValue();
  const localWeightKg = getWeightKgValue();
  const localBmi = localHeightCm && localWeightKg
    ? Number((localWeightKg / ((localHeightCm / 100) ** 2)).toFixed(1))
    : null;
  const bmi        = predictionResult?.bmi ?? localBmi;
  const baseline   = predictionResult?.baseline ?? null;
  const factors    = predictionResult?.factor_contributions ?? null;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshPredictionState(); } finally { setRefreshing(false); }
  }, [refreshPredictionState]);

  function openLink(url) {
    Linking.openURL(url).catch(() => log.warn('ReportScreen: could not open URL', url));
  }

  const FACTOR_KEYS = [
    { key: 'chronotype', label: 'Chronotype' },
    { key: 'age',        label: 'Age' },
    { key: 'sleep_time', label: 'Bedtime' },
    { key: 'bmi',        label: 'BMI' },
    { key: 'wake_time',  label: 'Wake-up Time' },
    { key: 'ethnicity',  label: 'Ethnicity' },
  ];

  const bmiStatus = (() => {
    if (bmi == null) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: '#3498db' };
    if (bmi < 25) return { label: 'Healthy Weight', color: '#7EC49A' };
    if (bmi < 30) return { label: 'Overweight', color: '#E9A94A' };
    return { label: 'Obese', color: '#D9694F' };
  })();

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <View style={styles.safeBottom}>
        <View style={styles.root}>
          <LinearGradient colors={[colors.background, colors.background]} style={StyleSheet.absoluteFillObject} />

          <ScrollView
            style={{flex:1}}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentSoft} colors={[colors.brandSoft]} progressBackgroundColor={colors.surface} />
            }
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.appTitle}>ADChronotype</Text><TouchableOpacity accessibilityLabel="Log out" onPress={signOut} style={{width:44,height:44,borderRadius:22,backgroundColor:colors.tint,alignItems:'center',justifyContent:'center'}}><Feather name="log-out" size={20} color={colors.accent}/></TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.headerCognitiveBtn}
              onPress={() => navigation.navigate('CognitiveTest')}
              activeOpacity={0.85}
            >
              <Feather name="activity" size={18} color={colors.accent} />
              <Text style={styles.cognitiveBtnText}>Take Cognitive Test</Text>
            </TouchableOpacity>

<View style={styles.scoreCard}>
 <Text style={styles.scoreLabel}>Cognitive Similarity Score</Text>
 <View style={styles.ringWrap}>
  <Svg width={160} height={160} viewBox="0 0 160 160"><Circle cx="80" cy="80" r="68" stroke={colors.border} strokeWidth="14" fill="none"/><Circle cx="80" cy="80" r="68" stroke={colors.accent} strokeWidth="14" fill="none" strokeDasharray={2*Math.PI*68} strokeDashoffset={2*Math.PI*68*(1-Math.min(100,Math.max(0,score))/100)} strokeLinecap="round" rotation="-90" origin="80,80"/></Svg>
  <View style={styles.ringCenter}><Text style={[styles.scoreNum,{color:colors.accent}]}>{score}%</Text></View>
 </View>
 <View style={[styles.riskBadge,{backgroundColor:score<30?colors.successSurface:colors.warningSurface}]}><Feather name={score<30?'check':'alert-triangle'} size={16} color={score<30?colors.successText:colors.warningStrong}/><Text style={[styles.riskText,{color:score<30?colors.successText:colors.warningStrong}]}>{similarityLabel}</Text></View>
</View>
<View style={styles.disclaimer}><Text style={styles.disclaimerTitle}>IMPORTANT — NOT A CLINICAL DIAGNOSIS</Text><Text style={styles.disclaimerBody}>{RESEARCH_DISCLAIMER_SHORT}</Text><TouchableOpacity onPress={()=>setShowResearchDetails(true)}><Text style={styles.researchToggleText}>View full disclaimer and research sources</Text></TouchableOpacity></View>
{bmiStatus&&<View style={[styles.bmiCard,{backgroundColor:bmi>=18.5&&bmi<25?colors.successSurface:colors.warningSurface}]}><Text style={[styles.bmiText,{color:bmi>=18.5&&bmi<25?colors.successText:colors.warningStrong}]}>{bmiStatus.label} · BMI {Number(bmi).toFixed(1)}</Text></View>}
<View style={{marginBottom:14}}><Text style={styles.colTitle}>Factor Contribution</Text><Text style={styles.baselineText}>{baseline!=null ? 'Baseline: '+baseline+'% — shifted by the factors below' : 'Baseline shifted by the factors below'}</Text></View>
<View style={styles.factorGrid}>{factors?FACTOR_KEYS.map(({key,label})=>{const val=factors[key];if(val==null)return null;const impact=impactLabel(val);return <View key={key} style={styles.factorCell}>
 <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Text style={styles.factorLabel}>{label}</Text><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={[styles.factorVal,{color:val<0?colors.successText:'#B8432F'}]}>{val>0?'+':''}{Number(val).toFixed(1)}%</Text><View style={[styles.impactBadge,{backgroundColor:impact.color+'22'}]}><Text style={[styles.impactText,{color:Math.abs(val)>=10?'#8F3220':Math.abs(val)>=5?colors.warningStrong:colors.successText}]}>{impact.text}</Text></View></View></View>
 <View style={{height:8,borderRadius:4,backgroundColor:colors.border}}><View style={{height:8,borderRadius:4,width:Math.min(100,Math.abs(val)/Math.max(1,...Object.values(factors).map(v=>Math.abs(Number(v)||0)))*100)+'%',backgroundColor:val<0?'#5FA77A':Math.abs(val)>=10?'#D9694F':'#E3A24A'}}/></View>
 </View>}):<Text style={styles.factorPlaceholderText}>Factor contribution information is unavailable for this result.</Text>}</View>
<View style={{flexDirection:'row',gap:10,marginTop:18}}><TouchableOpacity style={styles.tipsBtn} onPress={()=>navigation.navigate('Tips')}><Text style={styles.tipsBtnText}>View Tips</Text></TouchableOpacity><TouchableOpacity style={styles.reportBtn} onPress={()=>navigation.navigate('DoctorReport')}><Text style={styles.reportBtnText}>Doctor Report</Text></TouchableOpacity></View>
            <View style={{height:20}}/>
          </ScrollView>

<DesignNav navigation={navigation} active="Report" badgeCount={caregiverRequestCount}/>
        </View>
      </View>

      <Modal
        visible={showResearchDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResearchDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.researchModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About Your Research Score</Text>
              <TouchableOpacity onPress={() => setShowResearchDetails(false)} accessibilityLabel="Close">
                <Feather name="x" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
              <Text style={styles.modalSectionTitle}>Not a Clinical Diagnosis</Text>
              <Text style={styles.modalBody}>{RESEARCH_DISCLAIMER}</Text>
              <Text style={styles.modalSectionTitle}>How the Score Is Calculated</Text>
              <Text style={styles.modalBody}>{RESEARCH_METHODOLOGY}</Text>
              <Text style={styles.modalSectionTitle}>Research Sources</Text>
              {RESEARCH_SOURCES.map(source => (
                <TouchableOpacity key={source.label} onPress={() => openLink(source.url)} style={styles.modalLinkRow}>
                  <Text style={styles.modalLink}>{source.label} — View published research</Text>
                  <Feather name="external-link" size={13} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowResearchDetails(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
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
  scroll:     {paddingHorizontal:20},

  header:     {flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:16,marginBottom:14},
  appTitle:   { color: colors.text, fontSize: 22, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
  headerCognitiveBtn: {flexDirection:'row',gap:8,minHeight:50,borderRadius:14,backgroundColor:colors.tint,alignItems:'center',justifyContent:'center',marginBottom:14},

  colTitle:   {color:colors.text,fontSize:16,fontFamily:'Lexend_800ExtraBold',marginBottom:2},

  scoreLabel: {color:colors.secondary,fontSize:13,fontFamily:'Lexend_700Bold'},
  ringWrap:   {width:160,height:160,alignItems:'center',justifyContent:'center'},
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreNum:   {fontSize:40,fontFamily:'Lexend_800ExtraBold'},

  riskBadge:  {flexDirection:'row',gap:6,paddingVertical:7,paddingHorizontal:16,borderRadius:20,alignItems:'center'},

  riskText:   {fontSize:14,fontFamily:'Lexend_700Bold'},

  disclaimer:      {backgroundColor:colors.warningSurface,borderWidth:1,borderColor:colors.warningBorder,borderRadius:14,paddingVertical:12,paddingHorizontal:14,gap:6,marginBottom:14},
  disclaimerTitle: {color:colors.warningStrong,fontSize:12,fontFamily:'Lexend_800ExtraBold'},
  disclaimerBody:  {color:colors.warningBody,fontSize:12.5,fontFamily:'Lexend_400Regular',lineHeight:18.75},

  researchToggleText: {color:colors.accent,fontSize:12.5,fontFamily:'Lexend_700Bold'},
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  researchModal: { width: '100%', maxWidth: 520, maxHeight: '82%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.accent + '66', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 18, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', flex: 1 },
  modalScroll: { flexGrow: 0 },
  modalSectionTitle: { color: colors.text, fontSize: 13, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal', marginTop: 10, marginBottom: 5 },
  modalBody: {fontFamily:'Lexend_400Regular', color: colors.secondary, fontSize: 12, lineHeight: 19 },
  modalLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 7 },
  modalLink: {fontFamily:'Lexend_400Regular', color: colors.accent, fontSize: 12, lineHeight: 17, textDecorationLine: 'underline', flex: 1 },
  modalCloseButton: { backgroundColor: colors.brand, borderRadius: 10, alignItems: 'center', paddingVertical: 11, marginTop: 14 },
  modalCloseText: { color: colors.onBrand, fontSize: 14, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },

  bmiCard:    {backgroundColor:colors.successSurface,borderRadius:14,padding:12,alignItems:'center',marginBottom:14},
  bmiText:    {color:colors.successText,fontSize:14,fontFamily:'Lexend_700Bold'},

  tipsBtn:    {flex:1,minHeight:52,backgroundColor:colors.brand,borderRadius:14,alignItems:'center',justifyContent:'center'},
  tipsBtnText:{color:colors.onBrand,fontSize:15,fontFamily:'Lexend_700Bold'},
  reportBtn:  {flex:1,minHeight:52,backgroundColor:colors.surface,borderRadius:14,borderWidth:1.5,borderColor:colors.accent,alignItems:'center',justifyContent:'center'},
  reportBtnText:{color:colors.accent,fontSize:15,fontFamily:'Lexend_700Bold'},
  cognitiveBtnText: {color:colors.accent,fontSize:14,fontFamily:'Lexend_700Bold'},

  baselineText: {color:colors.secondary,fontSize:12,fontFamily:'Lexend_400Regular'},
  factorGrid:   {gap:9},
  factorCell:   {backgroundColor:colors.surface,borderRadius:14,paddingVertical:12,paddingHorizontal:14,gap:8},
  factorLabel:  {color:colors.text,fontSize:14,fontFamily:'Lexend_700Bold',flexShrink:1},
  factorVal:    {fontSize:14,fontFamily:'Lexend_800ExtraBold'},
  impactBadge:  {paddingVertical:3,paddingHorizontal:8,borderRadius:8},

  impactText:   {fontSize:10.5,fontFamily:'Lexend_700Bold'},

  factorPlaceholderText: {fontFamily:'Lexend_400Regular', color: colors.muted, fontSize: 11, lineHeight: 17 },

  // suggestion bubble

  // bottom nav

scoreCard: {backgroundColor:colors.surface,borderRadius:22,paddingTop:22,paddingBottom:18,paddingHorizontal:16,alignItems:'center',gap:8,marginBottom:14,shadowColor:'#78461E',shadowOpacity:0.08,shadowRadius:20,shadowOffset:{width:0,height:6},elevation:2},
});
