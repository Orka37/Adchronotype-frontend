import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../theme/designTheme';
export default function DesignNav({navigation,active,badgeCount=0}) {
 const {colors}=useTheme();
 const insets=useSafeAreaInsets();
 return <View style={{flexDirection:'row',backgroundColor:colors.surface,borderTopWidth:1,borderTopColor:colors.border,paddingTop:8,paddingHorizontal:6,paddingBottom:Math.max(12,insets.bottom)}}>
  {[['Report','Home','home'],['SleepLog','Sleep','moon'],['Tips','Tips','book-open'],['Caregiver','Caregiver','users'],['Profile','Profile','user']].map(([route,label,icon])=><TouchableOpacity key={route} accessibilityRole="tab" accessibilityState={{selected:active===route}} onPress={()=>navigation.navigate(route)} style={{flex:1,minHeight:44,alignItems:'center',gap:4}}>
   <Feather name={icon} size={22} color={active===route?colors.accent:colors.secondary}/>
   <Text style={{fontFamily:active===route?'Lexend_700Bold':'Lexend_600SemiBold',fontSize:11,color:active===route?colors.accent:colors.secondary}}>{label}</Text>
   {route==='Caregiver'&&badgeCount>0&&<View style={{position:'absolute',right:10,top:-5,borderRadius:9,backgroundColor:colors.errorText,paddingHorizontal:4}}><Text style={{color:'#FFFFFF',fontFamily:'Lexend_700Bold',fontSize:10}}>{badgeCount>9?'9+':badgeCount}</Text></View>}
  </TouchableOpacity>)}
 </View>;
}
