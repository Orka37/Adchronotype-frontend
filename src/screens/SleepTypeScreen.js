import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, Image, Modal, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import StepIndicator from '../components/StepIndicator';
import { useOnboarding } from '../context/OnboardingContext';
import { useAuth } from '../context/AuthContext';
import { log } from '../utils/logger';

export default function SleepTypeScreen({ navigation, route }) {
  const {
    sleepType: selectedOption,
    setSleepType: setSelectedOption,
    hasCompletedPrediction,
  } = useOnboarding();
  const { welcomeShown, markWelcomeShown } = useAuth();
  const skipWelcome = route?.params?.skipWelcome === true;
  const isRetake = skipWelcome || hasCompletedPrediction;
  const isFocused = useIsFocused();

  const [showWelcome,      setShowWelcome]      = useState(false);
  const [showFactorAuto,   setShowFactorAuto]   = useState(false);
  const [quizOpened,       setQuizOpened]       = useState(false);
  const [canChooseType,    setCanChooseType]    = useState(isRetake);

  useEffect(() => {
    setCanChooseType(isRetake);

    if (isRetake) {
      const t = setTimeout(() => setShowFactorAuto(true), 300);
      return () => clearTimeout(t);
    }

    if (!welcomeShown) {
      const t = setTimeout(() => setShowWelcome(true), 400);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setShowFactorAuto(true), 300);
    return () => clearTimeout(t);
  }, [isRetake, welcomeShown]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setShowWelcome(false);
      setShowFactorAuto(false);
    });

    return unsubscribe;
  }, [navigation]);

  function handleWelcomeOk() {
    setShowWelcome(false);
    markWelcomeShown();
    log.debug('SleepTypeScreen: welcome dismissed, showing chronotype quiz prompt');
    setTimeout(() => setShowFactorAuto(true), 300);
  }

  function openMEQ() {
    setQuizOpened(true);
    Linking.openURL('https://qxmd.com/calculate/calculator_829/morningness-eveningness-questionnaire-meq#')
      .catch(() => log.warn('SleepTypeScreen: could not open MEQ link'));
  }

  function allowChronotypeSelection() {
    setCanChooseType(true);
    setShowFactorAuto(false);
  }

  function handleNext() {
    setShowWelcome(false);
    setShowFactorAuto(false);
    navigation.navigate('SleepTime');
  }

  const options = [
    { id: 'Definite Morning', title: 'Definite Morning', icon: <Feather name="sun"     size={24} color="#fcd53f" /> },
    { id: 'Moderate Morning', title: 'Moderate Morning', icon: <Feather name="sunrise" size={24} color="#a67cf4" /> },
    { id: 'Intermediate',     title: 'Intermediate',     icon: <Ionicons name="person" size={24} color="#ffd25c" /> },
    { id: 'Moderate Evening', title: 'Moderate Evening', icon: <Feather name="sunset"  size={24} color="#9a73ef" /> },
    { id: 'Definite Evening', title: 'Definite Evening', icon: <Feather name="moon"    size={24} color="#8a52f3" /> },
  ];

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
            <StepIndicator currentStep={1} totalSteps={5} />
            <View style={{ width: 32 }} />
          </View>

          <View style={styles.contentWrapper}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>What is your sleep type?</Text>
              <Text style={styles.subtitle}>Select the option that best describes you.</Text>
            </View>

            <View style={styles.optionsContainer}>
              {options.map((option) => {
                const isActive = selectedOption === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionCard,
                      isActive && styles.optionCardActive,
                      !canChooseType && styles.optionCardDisabled,
                    ]}
                    activeOpacity={canChooseType ? 0.7 : 1}
                    disabled={!canChooseType}
                    onPress={() => setSelectedOption(option.id)}
                  >
                    <View style={styles.optionIconContainer}>{option.icon}</View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                    </View>
                    <View style={styles.checkContainer}>
                      {isActive && (
                        <View style={styles.checkCircle}>
                          <Feather name="check" size={12} color="#ffffff" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[styles.nextButton, !selectedOption && styles.nextButtonDisabled]}
              disabled={!selectedOption}
              activeOpacity={0.8}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Welcome popup — first visit only */}
      <Modal visible={isFocused && showWelcome} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity style={styles.popupClose} onPress={handleWelcomeOk}>
              <Text style={styles.popupCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.popupTitle}>Welcome to AD Chronotype</Text>
            <Text style={styles.popupBody}>
              Hey there!{'\n\n'}
              Thank you for choosing ADChronotype. Complete the 5-step questionnaire to get your personalised brain health score based on your sleep patterns and lifestyle factors.
            </Text>
            <TouchableOpacity style={styles.popupBtn} onPress={handleWelcomeOk}>
              <Text style={styles.popupBtnText}>Okay!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Factor Details — auto-popup after welcome */}
      <Modal visible={isFocused && showFactorAuto} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            {isRetake && (
              <TouchableOpacity style={styles.popupClose} onPress={allowChronotypeSelection}>
                <Text style={styles.popupCloseText}>×</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.popupTitle}>Take the Chronotype Quiz</Text>
            <Text style={styles.popupBody}>
              Before choosing your sleep type, complete the Morningness-Eveningness Questionnaire (MEQ). The quiz returns your chronotype category.
            </Text>
            <View style={styles.popupBtnRow}>
              {isRetake && (
                <TouchableOpacity style={styles.popupBtnSecondary} onPress={allowChronotypeSelection}>
                  <Text style={styles.popupBtnSecondaryText}>I already know my chronotype</Text>
                </TouchableOpacity>
              )}
              {quizOpened && !isRetake && (
                <TouchableOpacity style={styles.popupBtnSecondary} onPress={allowChronotypeSelection}>
                  <Text style={styles.popupBtnSecondaryText}>I completed the quiz</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.popupBtn} onPress={openMEQ}>
                <Text style={styles.popupBtnText}>Take Quiz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  safeAreaTop:    { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeAreaBottom: { flex: 1, backgroundColor: '#030A31', position: 'relative' },
  container:      { flex: 1, backgroundColor: '#030A31', paddingHorizontal: 20 },
  imageContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: -1 },
  heroImage:      { width: '100%', height: '100%', opacity: 0.9 },
  imageOverlay:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  backButton:     { padding: 4 },
  contentWrapper: { flex: 1, paddingTop: 8 },
  textContainer:  { alignItems: 'center', marginBottom: 14, paddingHorizontal: 10 },
  title:          { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', lineHeight: 32, marginBottom: 8 },
  subtitle:       { fontSize: 14, color: '#e0e0e0', textAlign: 'center', lineHeight: 20 },
  optionsContainer:    { gap: 10 },
  optionCard:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161b3d', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: 'transparent', minHeight: 72 },
  optionCardActive:    { backgroundColor: '#181735', borderColor: '#8a52f3' },
  optionIconContainer: { width: 40, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionTextContainer: { flex: 1 },
  optionTitle:    { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 3 },
  optionSubtitle: { fontSize: 12, color: '#a0a3b8', lineHeight: 16 },
  checkContainer: { width: 24, alignItems: 'flex-end' },
  checkCircle:    { width: 20, height: 20, borderRadius: 10, backgroundColor: '#8a52f3', alignItems: 'center', justifyContent: 'center' },
  bottomContainer:{ marginBottom: 20, marginTop: 10 },
  nextButton:     { backgroundColor: '#8a52f3', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },

  // Modals
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popup:          { backgroundColor: '#0e1228', borderRadius: 18, padding: 24, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: '#1f254f', position: 'relative' },
  popupClose:     { position: 'absolute', top: 14, right: 18, zIndex: 10 },
  popupCloseText: { color: '#6c7094', fontSize: 22, fontWeight: '400', lineHeight: 24 },
  popupTitle:     { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 14, paddingRight: 20 },
  popupBody:      { color: '#a0a3b8', fontSize: 14, lineHeight: 22 },
  popupLink:      { color: '#7c3aed', fontSize: 11, lineHeight: 18, textDecorationLine: 'underline', flexWrap: 'wrap', flexShrink: 1 },
  popupBtnRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  popupBtn:       { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start' },
  popupBtnText:   { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  popupBtnSecondary:     { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#1f254f', alignSelf: 'flex-start', maxWidth: '100%' },
  popupBtnSecondaryText: { color: '#6c7094', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
