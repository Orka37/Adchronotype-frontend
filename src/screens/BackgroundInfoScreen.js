import { useTheme, useThemedStyles } from '../theme/designTheme';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, Image, Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import StepIndicator from '../components/StepIndicator';
import { useOnboarding } from '../context/OnboardingContext';

const ETHNICITIES = [
  'South Asian', 'East Asian', 'Black or African American',
  'Hispanic or Latino', 'White', 'Middle Eastern',
  'Native American', 'Pacific Islander', 'Other', 'Prefer not to say',
];
const SEX_OPTIONS = ['Male', 'Female'];
const FAMILY_OPTIONS = ['Yes', 'No', "Don't know"];

function ListPicker({ visible, title, items, selected, onSelect, onClose }) {

  const ps = useThemedStyles(createPs);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={ps.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={ps.box}>
          <View style={ps.handle} />
          <View style={ps.header}>
            <Text style={ps.title}>{title}</Text>
            <TouchableOpacity style={ps.done} onPress={onClose}>
              <Text style={ps.doneText}>Done ✓</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <TouchableOpacity
                key={item}
                style={[ps.item, selected === item && ps.itemSel]}
                onPress={() => { onSelect(item); setTimeout(onClose, 150); }}
                activeOpacity={0.7}
              >
                <Text style={[ps.itemText, selected === item && ps.itemTextSel]}>{item}</Text>
                {selected === item && <Text style={ps.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createPs = (colors) => StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  box:        { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28 },
  handle:     { width: 40, height: 4, backgroundColor: colors.handle, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:      { color: colors.text, fontSize: 14, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  done:       { backgroundColor: colors.brand, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 },
  doneText:   { color: colors.onBrand, fontSize: 13, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  item:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemSel:    { backgroundColor: colors.accent + '15' },
  itemText:   {fontFamily:'Lexend_400Regular', color: colors.secondary, fontSize: 15 },
  itemTextSel:{ color: colors.accent, fontFamily: 'Lexend_700Bold', fontWeight: 'normal' },
  check:      { color: colors.accent, fontSize: 16, fontFamily: 'Lexend_800ExtraBold', fontWeight: 'normal' },
});

export default function BackgroundInfoScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { ethnicity, setEthnicity, gender, setGender, familyHistory, setFamilyHistory } = useOnboarding();

  const [openPicker, setOpenPicker] = useState(null); // 'eth' | 'gen' | 'fam'

  useEffect(() => {
    if (gender && !SEX_OPTIONS.includes(gender)) setGender(null);
    if (familyHistory && !FAMILY_OPTIONS.includes(familyHistory)) setFamilyHistory(null);
  }, [familyHistory, gender, setFamilyHistory, setGender]);

  const isFormValid = !!ethnicity && !!gender && !!familyHistory;

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <SafeAreaView style={styles.safeBottom}>
        <ScrollView contentContainerStyle={[styles.container,{flexGrow:1,flex:undefined}]} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[colors.background, colors.background]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }} />
          <View style={styles.imgWrap}>
            <Image source={require('../assets/home1.png')} style={styles.heroImg} resizeMode="cover" />
            <LinearGradient colors={['transparent', colors.background]} style={styles.imgOverlay} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="chevron-left" size={28} color={colors.secondary} />
            </TouchableOpacity>
            <StepIndicator currentStep={4} totalSteps={5} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>A bit of background</Text>
            <Text style={styles.sub}>Used as factors in your assessment.</Text>

            {/* Ethnicity */}
            <TouchableOpacity style={styles.field} onPress={() => setOpenPicker('eth')} activeOpacity={0.8}><Text style={styles.label}>Ethnicity</Text>
              <Text style={[styles.fieldVal, !ethnicity && styles.placeholder]}>{ethnicity || 'Tap to select'}</Text>
              <Feather name="chevron-right" size={18} color={colors.secondary} />
            </TouchableOpacity>

            {/* Sex */}
            <TouchableOpacity style={styles.field} onPress={() => setOpenPicker('gen')} activeOpacity={0.8}><Text style={styles.label}>Sex</Text>
              <Text style={[styles.fieldVal, !gender && styles.placeholder]}>{gender || 'Tap to select'}</Text>
              <Feather name="chevron-right" size={18} color={colors.secondary} />
            </TouchableOpacity>

            {/* Family history */}
            <TouchableOpacity style={styles.field} onPress={() => setOpenPicker('fam')} activeOpacity={0.8}><Text style={styles.label}>Family history of Alzheimer’s</Text>
              <Text style={[styles.fieldVal, !familyHistory && styles.placeholder]}>{familyHistory || 'Tap to select'}</Text>
              <Feather name="chevron-right" size={18} color={colors.secondary} />
            </TouchableOpacity><View style={{flexDirection:'row',gap:10,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:14,paddingVertical:14,paddingHorizontal:16,marginTop:8}}><Feather name="shield" size={20} color={colors.secondary}/><Text style={{flex:1,fontFamily:'Lexend_400Regular',fontSize:12.5,lineHeight:18.75,color:colors.secondary}}>These answers are saved with your profile. You can select “Prefer not to say” for ethnicity.</Text></View>
          </View>

          <View style={styles.bottom}>
            <TouchableOpacity
              style={[styles.nextBtn, !isFormValid && styles.nextBtnOff]}
              disabled={!isFormValid}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Review')}
            >
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ListPicker visible={openPicker === 'eth'} title="Select Ethnicity" items={ETHNICITIES} selected={ethnicity} onSelect={setEthnicity} onClose={() => setOpenPicker(null)} />
      <ListPicker visible={openPicker === 'gen'} title="Select Sex" items={SEX_OPTIONS} selected={gender} onSelect={setGender} onClose={() => setOpenPicker(null)} />
      <ListPicker visible={openPicker === 'fam'} title="Family History of Alzheimer's" items={FAMILY_OPTIONS} selected={familyHistory} onSelect={setFamilyHistory} onClose={() => setOpenPicker(null)} />
    </>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeTop:    { flex: 0, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: colors.background },
  container:  { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  imgWrap:    {display:'none'},
  heroImg:    { width: '100%', height: '100%', opacity: 0.9 },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header:     {flexDirection:'row',alignItems:'center',gap:12,paddingTop:16,paddingBottom:20},
  backBtn:    {width:44,height:44,alignItems:'center',justifyContent:'center'},
  content:    {flex:1},
  title:      {color:colors.text,fontSize:26,fontFamily:'Lexend_800ExtraBold',lineHeight:31.2,marginBottom:6,textAlign:'left'},
  sub:        {color:colors.secondary,fontSize:14,fontFamily:'Lexend_400Regular',marginBottom:22,lineHeight:21},
  label:      {color:colors.secondary,fontSize:15,fontFamily:'Lexend_600SemiBold',flex:1},
  field:      {backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,minHeight:64,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:14,paddingHorizontal:18,marginBottom:12,gap:8},
  fieldVal:   {color:colors.text,fontSize:16,fontFamily:'Lexend_800ExtraBold',textAlign:'right',flexShrink:1,maxWidth:'50%'},
  placeholder:{fontFamily:'Lexend_400Regular', color: colors.muted, fontSize: 15 },
  bottom:     {paddingTop:20,paddingBottom:20},
  nextBtn:    {backgroundColor:colors.brand,minHeight:56,borderRadius:16,alignItems:'center',justifyContent:'center'},
  nextBtnOff: { opacity: 0.5 },
  nextBtnText:{color:colors.onBrand,fontSize:18,fontFamily:'Lexend_700Bold'},

});
