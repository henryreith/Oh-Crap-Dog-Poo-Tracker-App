import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="bg-surface p-8 rounded-full shadow-lg shadow-primary/20 mb-8">
          <Image
            source={require('../../../../assets/images/logo.png')}
            className="w-32 h-32"
            resizeMode="contain"
          />
        </View>
        <Text className="text-4xl font-bold mt-4 text-text_primary text-center">Oh Crap</Text>
        <Text className="text-lg text-text_secondary mt-3 text-center leading-6">
          The smart way to track your dog's digestive health with AI.
        </Text>
      </View>
      <View className="w-full p-6 pb-12">
        <TouchableOpacity
          className="bg-primary p-5 rounded-2xl shadow-lg shadow-primary/30"
          onPress={() => navigation.navigate('Disclaimer')}
        >
          <Text className="text-text_on_primary text-center text-xl font-bold">Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;
