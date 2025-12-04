import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useProfile } from '../../hooks/useProfile';
import WelcomeScreen from '../screens/Onboarding/WelcomeScreen';
import DisclaimerScreen from '../screens/Onboarding/DisclaimerScreen';
import CreateDogProfileScreen from '../screens/Onboarding/CreateDogProfileScreen';
import EmailSignupScreen from '../screens/Onboarding/EmailSignupScreen';
import TabNavigator from './TabNavigator';
import LogPooScreen from '../screens/LogPooScreen';
import PooDetailScreen from '../screens/PooDetailScreen';
import RetakePromptScreen from '../screens/RetakePromptScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { profile, loading } = useProfile();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: isDark ? '#0F172A' : '#F5F7FA',
    },
  };

  return (
    <NavigationContainer theme={isDark ? DarkTheme : MyTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
            color: isDark ? '#F9FAFB' : '#111827',
          },
          headerBackTitleVisible: false,
          headerShadowVisible: false, // Cleaner look for Finpal style
        }}
      >
        {profile ? (
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={TabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="LogPoo" 
              component={LogPooScreen} 
              options={{ title: 'Log a Poo', headerBackTitle: 'Home' }}
            />
            <Stack.Screen 
              name="PooDetail" 
              component={PooDetailScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen} 
              options={{ title: 'Settings', headerShown: false }} 
            />
            <Stack.Screen 
              name="RetakePrompt" 
              component={RetakePromptScreen} 
              options={{ presentation: 'modal', headerShown: false }} 
            />
          </>
        ) : (
          <Stack.Group key="onboarding" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Disclaimer" component={DisclaimerScreen} />
            <Stack.Screen name="CreateDogProfile" component={CreateDogProfileScreen} />
            {/* <Stack.Screen name="EmailSignup" component={EmailSignupScreen} /> */}
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
