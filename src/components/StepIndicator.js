import { useTheme, useThemedStyles } from '../context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function StepIndicator({ currentStep, totalSteps = 5 }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View style={styles.row}>
      {steps.map((step, idx) => {
        const active    = step === currentStep;
        const completed = step < currentStep;
        return (
          <React.Fragment key={step}>
            <View style={[styles.circle, active && styles.circleActive, completed && styles.circleActive]}>
              {completed
                ? <Feather name="check" size={14} color={colors.onBrand} />
                : <Text style={[styles.num, active && styles.numActive]}>{step}</Text>
              }
            </View>
            {idx < totalSteps - 1 && <View style={styles.line} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: colors.brand,
  },
  num: {
    color: colors.secondary,
    fontSize: 15,
    fontFamily: 'Lexend_600SemiBold', fontWeight: 'normal',
  },
  numActive: {
    color: colors.onBrand,
  },
  line: {
    width: 18,
    height: 2,
    backgroundColor: colors.surface,
    marginHorizontal: 4,
  },
});
