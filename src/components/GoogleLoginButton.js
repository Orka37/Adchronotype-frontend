import React, {useRef, useState} from 'react';
import {ActivityIndicator, Platform, Text, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../theme/designTheme';

export default function GoogleLoginButton({onToken, onError, disabled}) {
  const {colors}=useTheme();
  const [busy,setBusy]=useState(false);
  const active=useRef(false);
  const webClientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId=process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const configured=Boolean(webClientId && (Platform.OS!=='ios'||iosClientId));
  async function login(){
    if(active.current||disabled||!configured)return;
    active.current=true;setBusy(true);
    try {
      // Lazy load so email/password remains usable in Expo Go as well.
      const {GoogleSignin,isSuccessResponse}=require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({webClientId,iosClientId,offlineAccess:false});
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
      const response=await GoogleSignin.signIn();
      if(isSuccessResponse(response)) {
        if(!response.data.idToken)throw new Error('Google did not return a sign-in token. Please try again.');
        await onToken(response.data.idToken);
      }
    } catch(error){
      if(error?.code!=='SIGN_IN_CANCELLED')onError(error);
    } finally{active.current=false;setBusy(false);}
  }
  return <View style={{marginTop:16}}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign in with Google" disabled={disabled||busy||!configured} onPress={login} style={{borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,borderRadius:6,minHeight:50,alignItems:'center',justifyContent:'center',opacity:disabled||busy||!configured?0.6:1}}>
      {busy?<ActivityIndicator color={colors.accent}/>:<Text style={{color:colors.text,fontFamily:'Lexend_600SemiBold',fontSize:15}}>Sign in with Google</Text>}
    </TouchableOpacity>
    {!configured&&<Text style={{color:colors.secondary,fontFamily:'Lexend_400Regular',fontSize:12,marginTop:6}}>Google sign-in is not available yet. Use email and password.</Text>}
  </View>;
}
