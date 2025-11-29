import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { useProfile } from '../../../hooks/useProfile';

const EmailSignupScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { createProfile } = useProfile();
  const { profileData } = route.params || {};

  const finalizeOnboarding = async () => {
    if (profileData) {
      try {
        await createProfile(profileData);
        // Navigation to Home happens automatically via AppNavigator when profile is set
      } catch (error) {
        console.error('Error creating profile:', error);
        Alert.alert('Error', 'Could not create profile. Please try again.');
      }
    } else {
      // Fallback if no profile data (shouldn't happen in normal flow)
      navigation.navigate('Home');
    }
  };

  const handleSignup = async () => {
    if (!email) {
      Alert.alert('Please enter your email.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('email_signups').insert({ email });
    
    if (error) {
      setLoading(false);
      if (error.code === '23505') { // Unique constraint violation
        Alert.alert('Already Signed Up', 'This email has already been registered. Thank you!', [
          { text: 'OK', onPress: finalizeOnboarding }
        ]);
      } else {
        Alert.alert('Error', 'Could not sign up. Please try again.');
        console.error('Supabase error:', error);
      }
    } else {
      setLoading(false);
      Alert.alert('Thanks for signing up!', 'You will now be taken to the home screen.', [
        { text: 'OK', onPress: finalizeOnboarding }
      ]);
    }
  };

  const handleSkip = () => {
    finalizeOnboarding();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-10" showsVerticalScrollIndicator={false}>
          <View className="items-center mb-10">
            <View className="bg-primary/10 p-5 rounded-full mb-6">
              <Ionicons name="mail-open" size={48} color={Colors.primary} />
            </View>
            <Text className="text-3xl font-bold text-center mb-3 text-text_primary">Stay in the loop</Text>
            <Text className="text-text_secondary text-center text-base px-4">
              Get occasional dog health tips and exclusive Oh Crap offers.
            </Text>
          </View>

          <View className="bg-surface p-6 rounded-3xl border border-border shadow-sm mb-8">
            <View className="mb-2">
              <Text className="text-text_secondary mb-2 ml-1 font-medium">Email Address</Text>
              <TextInput
                className="border border-border rounded-2xl p-4 bg-background text-text_primary text-base"
                placeholder="you@example.com"
                placeholderTextColor={Colors.text_muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            className={`p-5 rounded-2xl shadow-lg ${loading ? 'bg-surface_highlight shadow-none' : 'bg-primary shadow-primary/30'} mb-4`}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text className={`text-center text-xl font-bold ${loading ? 'text-text_secondary' : 'text-text_on_primary'}`}>
              {loading ? 'Signing up...' : 'Sign Me Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="p-4"
            onPress={handleSkip}
          >
            <Text className="text-text_secondary text-center font-medium text-base">No thanks, maybe later</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EmailSignupScreen;
