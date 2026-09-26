import { useTheme, useThemedStyles } from '../context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <SafeAreaView style={styles.safeAreaTop} />
      <SafeAreaView style={styles.safeAreaBottom}>
        <View style={styles.container}>
        <LinearGradient
          colors={[colors.background, colors.background]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}
        />
        
        {/* Hero Image area */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../assets/home1.png')} 
            style={styles.heroImage} 
            resizeMode="cover"
          />
          {/* An overlay to fade the bottom of the image into the background */}
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.imageOverlay}
          />
        </View>

        {/* Content Area */}
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleBold}>AD</Text>
            <Text style={styles.titleRegular}>Chronotype</Text>
          </View>

          <Text style={styles.subtitle}>
            Learn how sleep and lifestyle factors relate to cognitive health.
          </Text>

          <View style={styles.buttonsContainer}>
            {/* Get Started Button */}
            <TouchableOpacity 
              style={styles.buttonContainer} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SleepType')}
            >
              <LinearGradient
                colors={[colors.brandSoft, colors.brand]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <Feather name="arrow-right" size={20} color={colors.onBrand} />
              </LinearGradient>
            </TouchableOpacity>

            {/* About the Project Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ProjectInfo')}
            >
              <Text style={styles.secondaryButtonText}>About the Project</Text>
              <View style={styles.iconCircle}>
                <Feather name="info" size={14} color={colors.accent} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeAreaTop: {
    flex: 0,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  safeAreaBottom: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  imageContainer: {
    height: '50%',
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.28,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -40,
  },
  titleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  titleBold: {
    fontSize: 36,
    fontFamily: 'Lexend_700Bold', fontWeight: 'normal',
    color: colors.text,
    letterSpacing: -0.5,
  },
  titleRegular: {
    fontSize: 36,
    fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal',
    color: colors.accent,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: colors.onBrand,
    fontSize: 18,
    fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal',
    marginRight: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 18,
    fontFamily: 'Lexend_500Medium', fontWeight: 'normal',
    marginRight: 8,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
