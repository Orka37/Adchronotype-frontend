import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function StepIndicator({ currentStep, totalSteps = 5 }) {
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
                ? <Feather name="check" size={14} color="#fff" />
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: '#E07B3C',
  },
  num: {
    color: '#8A6A4E',
    fontSize: 15,
    fontWeight: '600',
  },
  numActive: {
    color: '#fff',
  },
  line: {
    width: 18,
    height: 2,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
});
