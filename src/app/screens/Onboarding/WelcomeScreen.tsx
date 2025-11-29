import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white">
      <View className="flex-1 items-center justify-center">
        <Image
          source={require('../../../../assets/images/logo.png')}
          className="w-40 h-40"
          resizeMode="contain"
        />
        <Text className="text-3xl font-bold mt-4">Poo Tracker</Text>
        <Text className="text-lg text-gray-600 mt-2">Track your dog's digestive health</Text>
      </View>
      <View className="w-full p-4">
        <TouchableOpacity
          className="bg-green-500 p-4 rounded-lg"
          onPress={() => navigation.navigate('Disclaimer')}
        >
          <Text className="text-white text-center text-lg">Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;
