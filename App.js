import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator  from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import SplashScreen  from './src/screens/SplashScreen';
import TermsScreen   from './src/screens/TermsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import { AuthProvider, useAuth }   from './src/context/AuthContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { hasCurrentDeviceConsent } from './src/utils/legalConsent';

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
      PrivacyPolicy: 'privacy-policy',
      Terms: 'terms',
    },
  },
};

function isAuthRecoveryRoute() {
  if (typeof window === 'undefined') return false;
  const path = window.location?.pathname || '';
  return path === '/ForgotPassword'
    || path === '/reset-password'
    || path === '/privacy-policy'
    || path === '/terms';
}

function PreAuthNavigator({ onDone }) {
  return (
    <PreAuthStack.Navigator screenOptions={{ headerShown: false }}>
      <PreAuthStack.Screen name="Splash">
        {props => <SplashScreen {...props} onDone={onDone} />}
      </PreAuthStack.Screen>
      <PreAuthStack.Screen name="Terms" component={TermsScreen} />
      <PreAuthStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </PreAuthStack.Navigator>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('App startup failed', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Unable to start ADChronotype</Text>
        <Text style={styles.errorText}>
          Please close and reopen the app. If this keeps happening, send this screen to the ADChronotype team.
        </Text>
        <Text style={styles.errorDetail}>{this.state.error?.message || 'Startup error'}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => this.setState({ error: null })}>
          <Text style={styles.errorButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

function RootNavigator() {
  const {
    user, loading, consentShown, markConsentGiven,
    requiresPreAuthConsent, markPreAuthConsentComplete,
  } = useAuth();
  const { hasCompletedPrediction, loadingSavedPrediction } = useOnboarding();
  const [splashChecked, setSplashChecked] = useState(false);
  const [showSplash,    setShowSplash]    = useState(false);
  const bypassSplash = isAuthRecoveryRoute();

  async function completeLegalConsent() {
    if (user) await markConsentGiven();
    markPreAuthConsentComplete();
    setShowSplash(false);
  }

  useEffect(() => {
    if (bypassSplash) {
      setShowSplash(false);
      setSplashChecked(true);
      return;
    }

    hasCurrentDeviceConsent().then(hasConsent => {
      setShowSplash(!hasConsent);
      setSplashChecked(true);
    }).catch(() => {
      setShowSplash(false);
      setSplashChecked(true);
    });
  }, [bypassSplash]);

  if (loading || !splashChecked || (user && loadingSavedPrediction)) {
    return (
      <View style={styles.startupLoading}>
        <View style={styles.startupLoadingAura}>
          <ActivityIndicator size="large" color="#E07B3C" />
        </View>
        <Text style={styles.startupLoadingText}>Preparing ADChronotype…</Text>
      </View>
    );
  }

  if (showSplash || requiresPreAuthConsent) {
    return <PreAuthNavigator onDone={completeLegalConsent} />;
  }

  if (user && !consentShown) {
    return (
      <PreAuthNavigator onDone={completeLegalConsent} />
    );
  }

  return user
    ? <AppNavigator initialRouteName={hasCompletedPrediction ? 'Report' : 'Welcome'} />
    : <AuthNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <AuthProvider>
          <OnboardingProvider>
            <NavigationContainer linking={linking}>
              <RootNavigator />
            </NavigationContainer>
          </OnboardingProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: '#FDF6F0',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#3D2B1F',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  errorText: {
    color: '#8A6A4E',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  errorDetail: {
    color: '#D9694F',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#E07B3C',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  startupLoading: {
    alignItems: 'center',
    backgroundColor: '#FDF6F0',
    flex: 1,
    justifyContent: 'center',
  },
  startupLoadingAura: {
    alignItems: 'center',
    backgroundColor: '#FBEADB',
    borderColor: '#F0D9C5',
    borderRadius: 42,
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  startupLoadingText: {
    color: '#8A6A4E',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 18,
  },
});
