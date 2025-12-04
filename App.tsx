import "./global.css";
import React from 'react';
import AppNavigator from './src/app/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider } from "./src/hooks/useProfile";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ProfileProvider>
          <AppNavigator />
        </ProfileProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
