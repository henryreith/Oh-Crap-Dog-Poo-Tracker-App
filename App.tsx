import "./global.css";
import React from 'react';
import AppNavigator from './src/app/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider } from "./src/hooks/useProfile";

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <AppNavigator />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
