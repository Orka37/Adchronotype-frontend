import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen        from '../screens/WelcomeScreen';
import SleepTypeScreen      from '../screens/SleepTypeScreen';
import SleepTimeScreen      from '../screens/SleepTimeScreen';
import UserInfoScreen       from '../screens/UserInfoScreen';
import BackgroundInfoScreen from '../screens/BackgroundInfoScreen';
import ReviewScreen         from '../screens/ReviewScreen';
import LoadingScreen        from '../screens/LoadingScreen';
import ReportScreen         from '../screens/ReportScreen';
import SleepLogScreen       from '../screens/SleepLogScreen';
import TipsScreen           from '../screens/TipsScreen';
import ProfileScreen        from '../screens/ProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import CognitiveTestScreen  from '../screens/CognitiveTestScreen';
import ProjectInfoScreen    from '../screens/ProjectInfoScreen';
import DoctorReportScreen   from '../screens/DoctorReportScreen';
import CaregiverScreen      from '../screens/CaregiverScreen';
import PrivacyPolicyScreen  from '../screens/PrivacyPolicyScreen';
import TermsScreen          from '../screens/TermsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ initialRouteName = 'Welcome' }) {
  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome"        component={WelcomeScreen} />
      <Stack.Screen name="SleepType"      component={SleepTypeScreen} />
      <Stack.Screen name="SleepTime"      component={SleepTimeScreen} />
      <Stack.Screen name="UserInfo"       component={UserInfoScreen} />
      <Stack.Screen name="BackgroundInfo" component={BackgroundInfoScreen} />
      <Stack.Screen name="Review"         component={ReviewScreen} />
      <Stack.Screen name="Loading"        component={LoadingScreen} />
      <Stack.Screen name="Report"         component={ReportScreen} />
      <Stack.Screen name="SleepLog"       component={SleepLogScreen} />
      <Stack.Screen name="Tips"           component={TipsScreen} />
      <Stack.Screen name="Profile"        component={ProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="CognitiveTest"  component={CognitiveTestScreen} />
      <Stack.Screen name="ProjectInfo"    component={ProjectInfoScreen} />
      <Stack.Screen name="DoctorReport"   component={DoctorReportScreen} />
      <Stack.Screen name="Caregiver"      component={CaregiverScreen} />
      <Stack.Screen name="PrivacyPolicy"  component={PrivacyPolicyScreen} />
      <Stack.Screen name="Terms"          component={TermsScreen} />
    </Stack.Navigator>
  );
}
