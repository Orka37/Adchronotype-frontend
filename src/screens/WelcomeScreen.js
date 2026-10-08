import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/designTheme';

export default function WelcomeScreen({navigation}) {
 const {colors}=useTheme();
 return <ScrollView style={{flex:1,backgroundColor:colors.background}} contentContainerStyle={{flexGrow:1}}>
  <View style={{height:400,backgroundColor:'#E8A062',overflow:'hidden'}}>
   <View style={{position:'absolute',top:120,left:'50%',marginLeft:-70,width:140,height:140,borderRadius:70,backgroundColor:'#FFE3B8'}} />
   <View style={{position:'absolute',left:-40,right:-40,bottom:60,height:160}}><Svg width="100%" height="160" viewBox="0 0 470 160" preserveAspectRatio="none"><Ellipse cx="235" cy="80" rx="235" ry="80" fill="#D07C3C"/></Svg></View>
   <View style={{position:'absolute',left:-60,right:-60,bottom:-40,height:160}}><Svg width="100%" height="160" viewBox="0 0 510 160" preserveAspectRatio="none"><Ellipse cx="255" cy="80" rx="255" ry="80" fill="#B8612A"/></Svg></View>
   <LinearGradient colors={['transparent',colors.background]} style={{position:'absolute',left:0,right:0,bottom:0,height:120}} />
  </View>
  <View style={{flexGrow:1,alignItems:'center',gap:16,paddingHorizontal:28,paddingBottom:36,marginTop:-24}}>
   <View style={{flexDirection:'row',alignItems:'baseline'}}><Text style={[s.brand,{color:colors.text,fontFamily:'Lexend_800ExtraBold'}]}>AD</Text><Text style={[s.brand,{color:colors.accent,fontFamily:'Lexend_600SemiBold'}]}>Chronotype</Text></View>
   <Text style={{fontFamily:'Lexend_400Regular',fontSize:17,lineHeight:26.35,textAlign:'center',color:colors.secondary,marginBottom:12}}>Learn how sleep and lifestyle factors relate to cognitive health.</Text>
   <View style={{width:'100%',marginTop:'auto',gap:14,paddingTop:20}}>
    <TouchableOpacity onPress={()=>navigation.navigate('SleepType')} style={[s.button,{backgroundColor:colors.brand}]}><Text style={{fontFamily:'Lexend_700Bold',fontSize:18,color:colors.onBrand}}>Get Started</Text><Feather name="arrow-right" size={20} color={colors.onBrand}/></TouchableOpacity>
    <TouchableOpacity onPress={()=>navigation.navigate('ProjectInfo')} style={[s.button,{minHeight:54,backgroundColor:colors.surface,borderWidth:1.5,borderColor:colors.border}]}><Text style={{fontFamily:'Lexend_600SemiBold',fontSize:17,color:colors.text}}>About the Project</Text><Feather name="info" size={18} color={colors.accent}/></TouchableOpacity>
   </View>
  </View>
 </ScrollView>;
}
const s=StyleSheet.create({brand:{fontFamily:'Lexend_400Regular',fontSize:38,letterSpacing:-0.5},button:{minHeight:56,borderRadius:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}});
