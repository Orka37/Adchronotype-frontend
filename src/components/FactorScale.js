import React from 'react';
import {View,Text} from 'react-native';
import {useTheme} from '../theme/designTheme';
export default function FactorScale({value,limit,label,color}) {
 const {colors}=useTheme();
 const length=Math.min(50,Math.abs(value)/limit*50);
 return <View accessibilityLabel={`${label}: ${value>0?'+':''}${value.toFixed(1)} percentage points; scale minus ${limit} to plus ${limit}`}>
  <View style={{height:8,backgroundColor:colors.border,position:'relative'}}>
   <View style={{position:'absolute',height:8,left:`${value<0?50-length:50}%`,width:`${length}%`,backgroundColor:color}}/>
   <View style={{position:'absolute',left:'50%',top:-3,height:14,width:1,backgroundColor:colors.secondary}}/>
  </View>
  <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:6}}>{[`−${limit} pp`,'0',`+${limit} pp`].map(t=><Text key={t} style={{fontFamily:'Lexend_400Regular',fontSize:10,color:colors.secondary}}>{t}</Text>)}</View>
 </View>;
}
