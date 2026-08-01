import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoadingScreen({ navigation }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [loadingText, setLoadingText] = useState('Analyzing your profile...');

  useEffect(() => {
    // Infinite pulsing aura animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Infinite spinning ring animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Dynamic text sequence to make the loading feel active
    const t1 = setTimeout(() => setLoadingText('Calculating sleep debt...'), 1000);
    const t2 = setTimeout(() => setLoadingText('Cross-referencing metrics...'), 2000);

    // Navigate to the Report screen after exactly 3 seconds
    const t3 = setTimeout(() => {
      navigation.replace('Report');
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [navigation]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      <SafeAreaView style={styles.safeAreaTop} />
      <SafeAreaView style={styles.safeAreaBottom}>
        <View style={styles.container}>
          {/* Base gradient matching the app palette */}
          <LinearGradient colors={['#030827', '#030A31']} style={styles.background} />
          
          <View style={styles.content}>
            
            <View style={styles.animationWrapper}>
              {/* Pulsing purple aura */}
              <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }] }]} />
              
              {/* Spinning purple dashed loading ring */}
              <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
                <MaterialCommunityIcons name="loading" size={100} color="#8a52f3" />
              </Animated.View>
              
              {/* Static center magic wand icon */}
              <View style={styles.centerIcon}>
                <MaterialCommunityIcons name="auto-fix" size={40} color="#ffffff" />
              </View>
            </View>

            <Text style={styles.title}>Generating Prediction</Text>
            <Text style={styles.subtitle}>{loadingText}</Text>
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
  },
  safeAreaBottom: {
    flex: 1,
    backgroundColor: '#030A31',
  },
  container: {
    flex: 1,
    backgroundColor: '#030A31',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(138, 82, 243, 0.15)',
  },
  spinner: {
    position: 'absolute',
  },
  centerIcon: {
    position: 'absolute',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a3b8',
    fontWeight: '500',
  },
});
