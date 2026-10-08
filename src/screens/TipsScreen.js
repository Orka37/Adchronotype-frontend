import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import {SafeAreaView as InsetSafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {useTheme} from '../theme/designTheme';
import DesignNav from '../components/DesignNav';
import {useCaregiverRequestCount} from '../hooks/useCaregiverRequestCount';
const selected = [
  {
    "cat": "CHRONOTYPE",
    "icon": "moon",
    "title": "Understanding Your Chronotype",
    "links": [
      {
        "label": "Can You Change Your Chronotype? — Healthline",
        "url": "https://www.healthline.com/health/sleep/chronotype"
      },
      {
        "label": "Take the Chronotype Quiz (MEQ)",
        "url": "https://www.cet-surveys.com/index.php?sid=61524"
      }
    ]
  },
  {
    "cat": "SLEEP",
    "icon": "cloud",
    "title": "Sleep & Brain Health",
    "links": [
      {
        "label": "How Sleep Clears the Brain — NIH",
        "url": "https://newsinhealth.nih.gov/2013/11/sleep-your-brain"
      },
      {
        "label": "Sleep Tips — CDC",
        "url": "https://www.cdc.gov/sleep/about_sleep/sleep_hygiene.html"
      }
    ]
  },
  {
    "cat": "BMI & DIET",
    "icon": "heart",
    "title": "Weight, Diet and Brain Risk",
    "links": [
      {
        "label": "Mediterranean Diet & Brain Health — Harvard",
        "url": "https://www.health.harvard.edu/mind-and-mood/the-mind-diet"
      }
    ]
  },
  {
    "cat": "FAMILY",
    "icon": "users",
    "title": "Genetics Is Not Destiny",
    "links": [
      {
        "label": "Lancet 2024 — 45% Dementia Is Preventable",
        "url": "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(24)01296-0/fulltext"
      }
    ]
  }
];
export default function TipsScreen({navigation}) {
 const {colors}=useTheme();const badgeCount=useCaregiverRequestCount();
 const open=url=>Linking.openURL(url).catch(()=>Alert.alert('Link unavailable','Please try again later.'));
 return <InsetSafeAreaView edges={['top']} style={{flex:1,backgroundColor:colors.background}}>
  <ScrollView contentContainerStyle={{paddingTop:16,paddingHorizontal:20,paddingBottom:20,gap:14}}>
   <Text style={{fontFamily:'Lexend_800ExtraBold',fontSize:26,color:colors.text}}>Research Tips</Text>
   {selected.map(tip=><View key={tip.cat} style={{paddingVertical:14,paddingHorizontal:16,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,gap:10}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}><View style={{width:36,height:36,borderRadius:18,backgroundColor:colors.tint,alignItems:'center',justifyContent:'center'}}><Feather name={tip.icon} size={18} color={colors.accent}/></View><Text style={{flex:1,fontFamily:'Lexend_700Bold',fontSize:15,color:colors.text}}>{tip.title}</Text><Text style={{fontFamily:'Lexend_800ExtraBold',fontSize:10,letterSpacing:0.6,paddingVertical:3,paddingHorizontal:8,borderRadius:8,backgroundColor:colors.tint,color:colors.accent}}>{tip.cat}</Text></View>
    {tip.links.map(link=><TouchableOpacity key={link.url} onPress={()=>open(link.url)} accessibilityRole="link" style={{flexDirection:'row',alignItems:'center',gap:6,minHeight:32}}><Text style={{flexShrink:1,fontFamily:'Lexend_600SemiBold',fontSize:13,lineHeight:19.5,color:colors.accent}}>{link.label}</Text><Feather name="external-link" size={14} color={colors.accent}/></TouchableOpacity>)}
   </View>)}
  </ScrollView>
  <DesignNav navigation={navigation} active="Tips" badgeCount={badgeCount}/>
 </InsetSafeAreaView>;
}
