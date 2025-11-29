import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BouncyCheckbox from 'react-native-bouncy-checkbox';

const DisclaimerScreen = ({ navigation }) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold text-center mb-4">Important Information</Text>
        <ScrollView className="flex-1 mb-4">
          <Text className="text-gray-600">
            IMPORTANT DISCLAIMER{'\n\n'}
            Poo Tracker is an educational tool only. It is NOT a substitute for 
            professional veterinary advice, diagnosis, or treatment.{'\n\n'}
            Always seek the advice of your veterinarian with any questions you may 
            have regarding your dog's health.{'\n\n'}
            Never disregard professional veterinary advice or delay in seeking it 
            because of information provided by this app.{'\n\n'}
            If you think your dog has a medical emergency, contact your vet immediately.{'\n\n'}
            By using this app, you acknowledge that you have read and understood 
            this disclaimer.
          </Text>
        </ScrollView>
        <View className="flex-row items-center mb-4">
          <BouncyCheckbox
            isChecked={isChecked}
            onPress={() => setIsChecked(!isChecked)}
            fillColor="green"
          />
          <Text className="ml-2 text-gray-700">I understand this is not medical advice</Text>
        </View>
        <TouchableOpacity
          className={`p-4 rounded-lg ${isChecked ? 'bg-green-500' : 'bg-gray-300'}`}
          onPress={() => navigation.navigate('CreateDogProfile')}
          disabled={!isChecked}
        >
          <Text className="text-white text-center text-lg">Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default DisclaimerScreen;
