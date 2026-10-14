import React from 'react';
import {View,Text} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useTheme} from '../theme/designTheme';
import {windowSegments} from '../utils/calmTimeline';
export default function CalmTimeline({calmWindows,hardWindows}) {
 const {colors}=useTheme();
 const text={fontFamily:'Lexend_400Regular',fontSize:11,color:colors.secondary};
 return <View style={{marginVertical:12}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}><Feather name="clock" size={14} color={colors.secondary}/><Text style={text}>24-hour pattern (patient’s local time)</Text></View>
  <View accessibilityLabel="Daily incident pattern; exact times listed below" style={{height:22,backgroundColor:colors.border,position:'relative',overflow:'hidden'}}>
   {[[calmWindows,'#5FA77A'],[hardWindows,'#D9694F']].flatMap(([windows,color],group)=>windowSegments(windows).map(([a,b],i)=><View key={`${group}-${i}`} style={{position:'absolute',left:`${a/1440*100}%`,width:`${(b-a)/1440*100}%`,height:22,backgroundColor:color}}/>))}
  </View>
  <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:5}}>{['00','06','12','18','24'].map(t=><Text key={t} style={text}>{t}</Text>)}</View>
  <Text style={[text,{marginTop:8}]}>Green: fewer incidents. Red: more incidents. Gray: no classified window.</Text>
  <Text style={[text,{marginTop:4}]}>Fewer recorded incidents do not confirm calm.</Text>
 </View>;
}
