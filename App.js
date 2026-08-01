import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import AppNavigator  from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import SplashScreen  from './src/screens/SplashScreen';
import TermsScreen   from './src/screens/TermsScreen';
import { AuthProvider, useAuth }   from './src/context/AuthContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { getStoredItem } from './src/utils/storage';

const PreAuthStack = createNativeStackNavigator();

const webOrigin =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : null;

const linking = {
  prefixes: ['adchronotype://', ...(webOrigin ? [webOrigin] : [])],
  config: {
    screens: {
      ForgotPassword: 'ForgotPassword',
      ResetPassword: 'reset-password',
    },
  },
};

function isAuthRecoveryRoute() {
  if (typeof window === 'undefined') return false;
  const path = window.location?.pathname || '';
  return path === '/ForgotPassword' || path === '/reset-password';
}

function PreAuthNavigator({ onDone }) {
  return (
    <PreAuthStack.Navigator screenOptions={{ headerShown: false }}>
      <PreAuthStack.Screen name="Splash">
        {props => <SplashScreen {...props} onDone={onDone} />}
      </PreAuthStack.Screen>
      <PreAuthStack.Screen name="Terms" component={TermsScreen} />
    </PreAuthStack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { hasCompletedPrediction, loadingSavedPrediction } = useOnboarding();
  const [splashChecked, setSplashChecked] = useState(false);
  const [showSplash,    setShowSplash]    = useState(false);
  const bypassSplash = isAuthRecoveryRoute();

  useEffect(() => {
    if (bypassSplash) {
      setShowSplash(false);
      setSplashChecked(true);
      return;
    }

    getStoredItem('splash_seen').then(val => {
      setShowSplash(val !== 'true');
      setSplashChecked(true);
    }).catch(() => {
      setShowSplash(false);
      setSplashChecked(true);
    });
  }, [bypassSplash]);

  if (loading || !splashChecked || (user && loadingSavedPrediction)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#05082a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (showSplash) {
    return <PreAuthNavigator onDone={() => setShowSplash(false)} />;
  }

  return user
    ? <AppNavigator initialRouteName={hasCompletedPrediction ? 'Report' : 'Welcome'} />
    : <AuthNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <NavigationContainer linking={linking}>
          <RootNavigator />
        </NavigationContainer>
      </OnboardingProvider>
    </AuthProvider>
  );
}
