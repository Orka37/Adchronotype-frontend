import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, Image, Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import StepIndicator from '../components/StepIndicator';
import { useOnboarding } from '../context/OnboardingContext';
import { log } from '../utils/logger';

const ETHNICITIES = [
  'South Asian', 'East Asian', 'Black or African American',
  'Hispanic or Latino', 'White', 'Middle Eastern',
  'Native American', 'Pacific Islander', 'Other', 'Prefer not to say',
];
const SEX_OPTIONS = ['Male', 'Female'];
const FAMILY_OPTIONS = ['Yes', 'No', "Don't know"];

function ListPicker({ visible, title, items, selected, onSelect, onClose }) {
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

const ps = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  box:        { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28 },
  handle:     { width: 40, height: 4, backgroundColor: '#D8C6B5', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0E2D4' },
  title:      { color: '#3D2B1F', fontSize: 14, fontWeight: '700' },
  done:       { backgroundColor: '#E07B3C', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 },
  doneText:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  item:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0E2D4' },
  itemSel:    { backgroundColor: '#E07B3C15' },
  itemText:   { color: '#8A6A4E', fontSize: 15 },
  itemTextSel:{ color: '#fff', fontWeight: '700' },
  check:      { color: '#E07B3C', fontSize: 16, fontWeight: '800' },
});

export default function BackgroundInfoScreen({ navigation }) {
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
        <View style={styles.container}>
          <LinearGradient colors={['#FDF6F0', '#FDF6F0']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }} />
          <View style={styles.imgWrap}>
            <Image source={require('../assets/home1.png')} style={styles.heroImg} resizeMode="cover" />
            <LinearGradient colors={['transparent', '#FDF6F0']} style={styles.imgOverlay} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="chevron-left" size={28} color="#8A6A4E" />
            </TouchableOpacity>
            <StepIndicator currentStep={4} totalSteps={5} />
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Background info</Text>
            <Text style={styles.sub}>Tap any field to select.</Text>

            {/* Ethnicity */}
            <Text style={styles.label}>Ethnicity</Text>
            <TouchableOpacity style={styles.field} onPress={() => setOpenPicker('eth')} activeOpacity={0.8}>
              <Text style={[styles.fieldVal, !ethnicity && styles.placeholder]}>{ethnicity || 'Tap to select'}</Text>
              <Feather name="chevron-down" size={18} color="#8A6A4E" />
            </TouchableOpacity>

            {/* Sex */}
            <Text style={styles.label}>Sex</Text>
            <TouchableOpacity style={styles.field} onPress={() => setOpenPicker('gen')} activeOpacity={0.8}>
              <Text style={[styles.fieldVal, !gender && styles.placeholder]}>{gender || 'Tap to select'}</Text>
              <Feather name="chevron-down" size={18} color="#8A6A4E" />
            </TouchableOpacity>

            {/* Family history */}
            <Text style={[styles.label, { color: '#7EC49A' }]}>Family history of Alzheimer's</Text>
            <TouchableOpacity style={styles.field} onPress={() => setOpenPicker('fam')} activeOpacity={0.8}>
              <Text style={[styles.fieldVal, !familyHistory && styles.placeholder]}>{familyHistory || 'Tap to select'}</Text>
              <Feather name="chevron-down" size={18} color="#8A6A4E" />
            </TouchableOpacity>
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
        </View>
      </SafeAreaView>

      <ListPicker visible={openPicker === 'eth'} title="Select Ethnicity" items={ETHNICITIES} selected={ethnicity} onSelect={setEthnicity} onClose={() => setOpenPicker(null)} />
      <ListPicker visible={openPicker === 'gen'} title="Select Sex" items={SEX_OPTIONS} selected={gender} onSelect={setGender} onClose={() => setOpenPicker(null)} />
      <ListPicker visible={openPicker === 'fam'} title="Family History of Alzheimer's" items={FAMILY_OPTIONS} selected={familyHistory} onSelect={setFamilyHistory} onClose={() => setOpenPicker(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  safeTop:    { flex: 0, backgroundColor: '#FDF6F0', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#FDF6F0' },
  container:  { flex: 1, backgroundColor: '#FDF6F0', paddingHorizontal: 20 },
  imgWrap:    { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: -1 },
  heroImg:    { width: '100%', height: '100%', opacity: 0.9 },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  backBtn:    { padding: 4 },
  content:    { flex: 1, paddingTop: 20 },
  title:      { color: '#3D2B1F', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub:        { color: '#8A6A4E', fontSize: 13, marginBottom: 20 },
  label:      { color: '#3D2B1F', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  field:      { backgroundColor: '#FFFFFF', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#F0E2D4' },
  fieldVal:   { color: '#3D2B1F', fontSize: 16, fontWeight: '600' },
  placeholder:{ color: '#B09A86', fontSize: 15 },
  bottom:     { marginBottom: 20, marginTop: 12 },
  nextBtn:    { backgroundColor: '#F0955A', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  nextBtnOff: { opacity: 0.5 },
  nextBtnText:{ color: '#fff', fontSize: 18, fontWeight: '600' },
});
