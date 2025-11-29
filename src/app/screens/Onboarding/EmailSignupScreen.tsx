import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';

const EmailSignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email) {
      Alert.alert('Please enter your email.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('email_signups').insert({ email });
    setLoading(false);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        Alert.alert('Already Signed Up', 'This email has already been registered. Thank you!');
      } else {
        Alert.alert('Error', 'Could not sign up. Please try again.');
        console.error('Supabase error:', error);
      }
    } else {
      Alert.alert('Thanks for signing up!', 'You will now be taken to the home screen.');
    }
    navigation.navigate('Home');
  };

  const handleSkip = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-4 justify-center">
      <Text className="text-2xl font-bold text-center mb-2">Stay in the loop</Text>
      <Text className="text-lg text-center text-gray-600 mb-8">
        Get occasional dog health tips and exclusive Oh Crap offers.
      </Text>
      <View className="mb-4">
        <TextInput
          className="border border-gray-300 p-3 rounded-lg"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      <TouchableOpacity
        className={`p-4 rounded-lg ${loading ? 'bg-gray-400' : 'bg-green-500'}`}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text className="text-white text-center text-lg">{loading ? 'Signing up...' : 'Sign Me Up'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mt-4"
        onPress={handleSkip}
      >
        <Text className="text-gray-500 text-center">Skip</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default EmailSignupScreen;
