import React from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { log } from '../utils/logger';
import { recordPreAuthLegalConsent } from '../utils/legalConsent';

export default function SplashScreen({ navigation, route, onDone }) {

  // Both flags come back after the user accepts each legal document.
  const termsAccepted = route?.params?.termsAccepted === true;
  const privacyAccepted = route?.params?.privacyAccepted === true;
  const legalAccepted = termsAccepted && privacyAccepted;

  async function handleGetStarted() {
    try {
      await recordPreAuthLegalConsent();
      log.info('SplashScreen: recorded current Terms and Privacy consent');
    } catch (err) {
      log.warn('SplashScreen: could not persist legal consent', err?.message);
    }
    if (onDone) onDone();
  }

  function openTerms() {
    navigation.navigate('Terms', { consentFlow: true });
  }

  return (
    <View style={{flex:1,backgroundColor:'#C2571E'}}><StatusBar style="light" />
      <ScrollView contentContainerStyle={{flexGrow:1,paddingTop:96,paddingHorizontal:28,paddingBottom:40}}>
        <View style={{flexGrow:1,alignItems:'center',justifyContent:'center',gap:20,paddingBottom:40}}>
          <View style={{width:112,height:112,borderRadius:28,backgroundColor:'#FDF6F0',alignItems:'center',justifyContent:'center'}}>
            <Svg width={64} height={64} viewBox="0 0 120 120"><Circle cx="52" cy="60" r="30" fill="#C2571E"/><Circle cx="67" cy="51" r="25" fill="#FDF6F0"/></Svg>
          </View>
          <View style={{flexDirection:'row',alignItems:'baseline'}}><Text style={{fontFamily:'Lexend_800ExtraBold',fontSize:36,letterSpacing:-0.5,color:'#FFFFFF'}}>AD</Text><Text style={{fontFamily:'Lexend_600SemiBold',fontSize:36,letterSpacing:-0.5,color:'#FFFFFF',opacity:0.92}}>Chronotype</Text></View>
          <Text style={{fontFamily:'Lexend_400Regular',fontSize:16,lineHeight:24,textAlign:'center',maxWidth:280,color:'#FFFFFF',opacity:0.95}}>Learn how sleep and lifestyle factors relate to cognitive health.</Text>
        </View>
        <View style={{gap:14}}>
          <TouchableOpacity onPress={openTerms} accessibilityRole="checkbox" accessibilityState={{checked:legalAccepted}} style={{flexDirection:'row',alignItems:'flex-start',gap:12,backgroundColor:'rgba(255,255,255,0.14)',borderRadius:14,padding:14}}>
            <View style={{width:20,height:20,marginTop:1,borderWidth:1.5,borderColor:'#FFFFFF',borderRadius:3,alignItems:'center',justifyContent:'center'}}>{legalAccepted && <Text style={{color:'#FFFFFF'}}>✓</Text>}</View>
            <Text style={{flex:1,fontFamily:'Lexend_400Regular',fontSize:13,lineHeight:18.85,color:'#FFFFFF'}}>{legalAccepted ? 'I have read and accept the ' : 'Read and accept the '}<Text style={{textDecorationLine:'underline'}}>Terms &amp; Conditions and Privacy Policy →</Text></Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={!legalAccepted} onPress={handleGetStarted} style={{minHeight:54,borderRadius:16,backgroundColor:'#FDF6F0',alignItems:'center',justifyContent:'center',opacity:legalAccepted?1:0.6}}><Text style={{fontFamily:'Lexend_700Bold',fontSize:17,color:'#9E4414'}}>Get Started  →</Text></TouchableOpacity>
          <Text style={{fontFamily:'Lexend_600SemiBold',fontSize:11,letterSpacing:0.66,textAlign:'center',color:'#FFFFFF',marginTop:4}}>NOT A CLINICAL DIAGNOSIS</Text>
        </View>
      </ScrollView>
    </View>
  );
}
