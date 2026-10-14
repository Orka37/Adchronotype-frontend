import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/designTheme';

export default function CareEventTimePicker({ value, onChange }) {
  const { colors, mode } = useTheme();
  const [picker, setPicker] = useState(null);
  if (Platform.OS === 'web') {
    const pad = n => String(n).padStart(2, '0');
    const format = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const update = event => { const date = new Date(event.target.value); if (!Number.isNaN(date.getTime())) onChange(date); };
    return <input aria-label="Event date and time" type="datetime-local" value={format(value)} max={format(new Date())}
      onInput={update} onChange={update} onBlur={update}
      style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius:6, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontFamily: 'inherit', fontSize: 14 }} />;
  }
  if (Platform.OS === 'ios') return <DateTimePicker value={value} mode="datetime" display="compact" maximumDate={new Date()} onChange={(_, date) => date && onChange(date)} themeVariant={mode} />;
  return <View>
    <TouchableOpacity accessibilityRole="button" onPress={() => setPicker('date')} style={{ paddingVertical: 12 }}><Text style={{ color: colors.accent }}>Date: {value.toLocaleDateString()}</Text></TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" onPress={() => setPicker('time')} style={{ paddingVertical: 12 }}><Text style={{ color: colors.accent }}>Time: {value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></TouchableOpacity>
    {picker && <DateTimePicker value={value} mode={picker} maximumDate={new Date()} onChange={(_, date) => { setPicker(null); if (date) onChange(date); }} />}
  </View>;
}
