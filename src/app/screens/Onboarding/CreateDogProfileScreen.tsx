import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../../../hooks/useProfile';
import { DogProfile } from '../../../types';
import { Colors } from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const CreateDogProfileScreen = ({ navigation }: { navigation: any }) => {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const { createProfile } = useProfile();

  const handleCreateProfile = async () => {
    if (!name || !age || !weight) {
      Alert.alert('Missing Information', 'Please fill out all required fields.');
      return;
    }

    const profileData: Omit<DogProfile, 'id'> = {
      name,
      breed,
      age: parseFloat(age),
      weight: parseFloat(weight),
    };

    // Pass profile data to EmailSignup screen instead of creating it immediately
    navigation.navigate('EmailSignup', { profileData });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
          <View className="items-center mb-8">
            <View className="bg-primary/10 p-5 rounded-full mb-4">
              <Ionicons name="paw" size={48} color={Colors.primary} />
            </View>
            <Text className="text-3xl font-bold text-center mb-2 text-text_primary">Create Profile</Text>
            <Text className="text-text_secondary text-center text-base">Tell us about your furry friend</Text>
          </View>

          <View className="bg-surface p-6 rounded-3xl border border-border shadow-sm mb-8">
            <View className="mb-5">
              <Text className="text-text_secondary mb-2 ml-1 font-medium">Name</Text>
              <TextInput
                className="border border-border rounded-2xl p-4 bg-background text-text_primary text-base"
                placeholder="Dog's Name"
                placeholderTextColor={Colors.text_muted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View className="mb-5">
              <Text className="text-text_secondary mb-2 ml-1 font-medium">Breed (Optional)</Text>
              <TextInput
                className="border border-border rounded-2xl p-4 bg-background text-text_primary text-base"
                placeholder="e.g. Golden Retriever"
                placeholderTextColor={Colors.text_muted}
                value={breed}
                onChangeText={setBreed}
              />
            </View>

            <View className="flex-row space-x-4">
              <View className="flex-1 mb-5 mr-2">
                <Text className="text-text_secondary mb-2 ml-1 font-medium">Age (years)</Text>
                <TextInput
                  className="border border-border rounded-2xl p-4 bg-background text-text_primary text-base"
                  placeholder="e.g. 3"
                  placeholderTextColor={Colors.text_muted}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
              </View>

              <View className="flex-1 mb-5 ml-2">
                <Text className="text-text_secondary mb-2 ml-1 font-medium">Weight (kg)</Text>
                <TextInput
                  className="border border-border rounded-2xl p-4 bg-background text-text_primary text-base"
                  placeholder="e.g. 25"
                  placeholderTextColor={Colors.text_muted}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            className="bg-primary p-5 rounded-2xl shadow-lg shadow-primary/30 mb-8"
            onPress={handleCreateProfile}
          >
            <Text className="text-text_on_primary text-center text-xl font-bold">Create Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateDogProfileScreen;
