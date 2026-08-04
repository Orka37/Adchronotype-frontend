import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <>
      <SafeAreaView style={styles.safeAreaTop} />
      <SafeAreaView style={styles.safeAreaBottom}>
        <View style={styles.container}>
        <LinearGradient
          colors={['#030827', '#030A31']}
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
            colors={['transparent', '#030A31']}
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
                colors={['#8a52f3', '#6a3be0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <Feather name="arrow-right" size={20} color="#fff" />
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
                <Feather name="info" size={14} color="#9a73ef" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeAreaTop: {
    flex: 0,
    backgroundColor: '#030827',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  safeAreaBottom: {
    flex: 1,
    backgroundColor: '#030A31',
  },
  container: {
    flex: 1,
    backgroundColor: '#030A31',
  },
  imageContainer: {
    height: '50%',
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
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
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  titleRegular: {
    fontSize: 36,
    fontWeight: '600',
    color: '#9a73ef',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#e0e0e0',
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
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
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
    borderColor: '#4d3b82',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: '#e0e0e0',
    fontSize: 18,
    fontWeight: '500',
    marginRight: 8,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#9a73ef',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
