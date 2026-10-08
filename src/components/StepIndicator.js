import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/designTheme';

export default function StepIndicator({ currentStep, totalSteps = 5 }) {
  const { colors } = useTheme();
  return <View accessibilityLabel={`Step ${currentStep} of ${totalSteps}`} style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12}}>
    <View style={{flex: 1, flexDirection: 'row', gap: 6}}>
      {Array.from({length: totalSteps}, (_, i) => <View key={i} style={{flex: 1, height: 6, borderRadius: 3, backgroundColor: i < currentStep ? colors.brand : colors.border}} />)}
    </View>
    <Text style={{width: 32, textAlign: 'right', fontSize: 13, fontFamily: 'Lexend_700Bold', color: colors.secondary}}>{currentStep}/{totalSteps}</Text>
  </View>;
}
