import React,{useEffect,useRef,useState} from 'react';
import {View,Text} from 'react-native';
import {useTheme} from '../theme/designTheme';
let loader;
function loadGoogle(){
  if(window.google?.accounts?.id)return Promise.resolve(window.google.accounts.id);
  if(!loader)loader=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
    script.onload=()=>window.google?.accounts?.id?resolve(window.google.accounts.id):reject(new Error('Google sign-in could not load.'));
    script.onerror=()=>{script.remove();loader=null;reject(new Error('Google sign-in could not load. Please reload or use email and password.'));};
    document.head.appendChild(script);
  });
  return loader;
}
export default function GoogleLoginButton({onToken,onError,disabled}){
  const {colors,mode}=useTheme();const host=useRef(null);const props=useRef({onToken,onError,disabled});props.current={onToken,onError,disabled};
  const active=useRef(false);const [error,setError]=useState('');
  const clientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  useEffect(()=>{
    if(!clientId)return;
    let mounted=true;
    loadGoogle().then(google=>{
      if(!mounted||!host.current)return;
      google.initialize({client_id:clientId,auto_select:false,callback:async response=>{
        if(!mounted||active.current||props.current.disabled)return;
        active.current=true;
        try{await props.current.onToken(response.credential);}catch(e){if(mounted)props.current.onError(e);}finally{active.current=false;}
      }});
      google.renderButton(host.current,{theme:mode==='dark'?'filled_black':'outline',size:'large',text:'signin_with',shape:'rectangular'});
    }).catch(e=>{if(mounted)setError(e.message);});
    return()=>{mounted=false;if(host.current)host.current.replaceChildren();};
  },[clientId,mode]);
  return <View style={{marginTop:16,alignItems:'center',opacity:disabled?0.6:1}}>
    {clientId?<div ref={host} style={{pointerEvents:disabled?'none':'auto'}}/>:<button disabled style={{fontFamily:'Lexend_600SemiBold',fontSize:15,color:colors.text,background:colors.surface,border:`1px solid ${colors.border}`,borderRadius:6,minHeight:50,width:'100%',opacity:0.6}}>Sign in with Google</button>}
    {(!clientId||error)&&<Text accessibilityRole="alert" style={{fontFamily:'Lexend_400Regular',fontSize:12,color:colors.secondary,marginTop:6}}>{error||'Google sign-in is not available yet. Use email and password.'}</Text>}
  </View>;
}
