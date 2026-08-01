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
  box:        { backgroundColor: '#161b3d', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28 },
  handle:     { width: 40, height: 4, backgroundColor: '#2a3060', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1f254f' },
  title:      { color: '#fff', fontSize: 14, fontWeight: '700' },
  done:       { backgroundColor: '#7c3aed', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 },
  doneText:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  item:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#1a2040' },
  itemSel:    { backgroundColor: '#7c3aed15' },
  itemText:   { color: '#8c91b5', fontSize: 15 },
  itemTextSel:{ color: '#fff', fontWeight: '700' },
  check:      { color: '#7c3aed', fontSize: 16, fontWeight: '800' },
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
          <LinearGradient colors={['#030827', '#030A31']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }} />
          <View style={styles.imgWrap}>
            <Image source={require('../assets/home1.png')} style={styles.heroImg} resizeMode="cover" />
            <LinearGradient colors={['transparent', '#030A31']} style={styles.imgOverlay} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="chevron-left" size={28} color="#fff" />
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
              <Feather name="chevron-down" size={18} color="#6c7094" />
            </TouchableOpacity>

            {/* Sex */}
            <Text style={styles.label}>Sex</Text>
            <TouchableOpacity style={styles.field} onPress={() => setOpenPicker('gen')} activeOpacity={0.8}>
              <Text style={[styles.fieldVal, !gender && styles.placeholder]}>{gender || 'Tap to select'}</Text>
              <Feather name="chevron-down" size={18} color="#6c7094" />
            </TouchableOpacity>

            {/* Family history */}
            <Text style={[styles.label, { color: '#00c9b1' }]}>Family history of Alzheimer's</Text>
            <TouchableOpacity style={styles.field} onPress={() => setOpenPicker('fam')} activeOpacity={0.8}>
              <Text style={[styles.fieldVal, !familyHistory && styles.placeholder]}>{familyHistory || 'Tap to select'}</Text>
              <Feather name="chevron-down" size={18} color="#6c7094" />
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
  safeTop:    { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#030A31' },
  container:  { flex: 1, backgroundColor: '#030A31', paddingHorizontal: 20 },
  imgWrap:    { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: -1 },
  heroImg:    { width: '100%', height: '100%', opacity: 0.9 },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  backBtn:    { padding: 4 },
  content:    { flex: 1, paddingTop: 20 },
  title:      { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub:        { color: '#6c7094', fontSize: 13, marginBottom: 20 },
  label:      { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  field:      { backgroundColor: '#161b3d', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#1f254f' },
  fieldVal:   { color: '#fff', fontSize: 16, fontWeight: '600' },
  placeholder:{ color: '#4a5270', fontSize: 15 },
  bottom:     { marginBottom: 20, marginTop: 12 },
  nextBtn:    { backgroundColor: '#8a52f3', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  nextBtnOff: { opacity: 0.5 },
  nextBtnText:{ color: '#fff', fontSize: 18, fontWeight: '600' },
});
