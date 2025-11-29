import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import { Colors } from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const DisclaimerScreen = ({ navigation }) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-4">
        <View className="items-center mb-6">
          <View className="bg-primary/10 p-4 rounded-full mb-4">
            <Ionicons name="medical-outline" size={40} color={Colors.primary} />
          </View>
          <Text className="text-2xl font-bold text-center text-text_primary">Important Information</Text>
        </View>
        
        <View className="flex-1 bg-surface rounded-3xl p-6 border border-border shadow-sm mb-6">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <Text className="text-text_secondary text-base leading-6">
              <Text className="font-bold text-text_primary">IMPORTANT DISCLAIMER{'\n\n'}</Text>
              Oh Crap is an educational tool only. It is <Text className="font-bold text-text_primary">NOT</Text> a substitute for 
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
        </View>

        <View className="mb-8">
          <View className="flex-row items-center mb-6 bg-surface p-4 rounded-2xl border border-border">
            <BouncyCheckbox
              isChecked={isChecked}
              onPress={() => setIsChecked(!isChecked)}
              fillColor={Colors.primary}
              unFillColor={Colors.surface}
              iconStyle={{ borderColor: Colors.primary }}
              innerIconStyle={{ borderWidth: 2 }}
              textStyle={{ textDecorationLine: "none" }}
            />
            <Text className="ml-2 text-text_primary flex-1 font-medium">I understand this is not medical advice</Text>
          </View>
          
          <TouchableOpacity
            className={`p-5 rounded-2xl shadow-lg ${isChecked ? 'bg-primary shadow-primary/30' : 'bg-surface_highlight shadow-none'}`}
            onPress={() => navigation.navigate('CreateDogProfile')}
            disabled={!isChecked}
          >
            <Text className={`text-center text-xl font-bold ${isChecked ? 'text-text_on_primary' : 'text-text_muted'}`}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DisclaimerScreen;
