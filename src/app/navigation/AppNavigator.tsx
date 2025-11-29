import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useProfile } from '../../hooks/useProfile';
import WelcomeScreen from '../screens/Onboarding/WelcomeScreen';
import DisclaimerScreen from '../screens/Onboarding/DisclaimerScreen';
import CreateDogProfileScreen from '../screens/Onboarding/CreateDogProfileScreen';
import EmailSignupScreen from '../screens/Onboarding/EmailSignupScreen';
import HomeScreen from '../screens/HomeScreen';
import LogPooScreen from '../screens/LogPooScreen';
import PooDetailScreen from '../screens/PooDetailScreen';
import RetakePromptScreen from '../screens/RetakePromptScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {profile ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="LogPoo" component={LogPooScreen} />
            <Stack.Screen name="PooDetail" component={PooDetailScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="RetakePrompt" component={RetakePromptScreen} options={{ presentation: 'modal' }} />
          </>
        ) : (
          <Stack.Group key="onboarding">
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Disclaimer" component={DisclaimerScreen} />
            <Stack.Screen name="CreateDogProfile" component={CreateDogProfileScreen} />
            <Stack.Screen name="EmailSignup" component={EmailSignupScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
