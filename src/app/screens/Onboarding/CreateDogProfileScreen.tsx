import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../../../hooks/useProfile';
import { DogProfile } from '../../../types';

const CreateDogProfileScreen = ({ navigation }) => {
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

    try {
      await createProfile(profileData);
      navigation.navigate('EmailSignup');
    } catch (error) {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-4">
// ...existing code...
      <View className="mb-4">
        <Text className="text-gray-600 mb-2">Name</Text>
        <TextInput
// ...existing code...
          value={name}
          onChangeText={setName}
        />
      </View>
// ...existing code...
      <View className="mb-4">
        <Text className="text-gray-600 mb-2">Breed (Optional)</Text>
        <TextInput
// ...existing code...
          value={breed}
          onChangeText={setBreed}
        />
      </View>
// ...existing code...
      <View className="mb-4">
        <Text className="text-gray-600 mb-2">Age (years)</Text>
        <TextInput
// ...existing code...
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
      </View>
// ...existing code...
      <View className="mb-4">
        <Text className="text-gray-600 mb-2">Weight (kg)</Text>
        <TextInput
// ...existing code...
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />
      </View>
      <TouchableOpacity
// ...existing code...
        onPress={handleCreateProfile}
      >
        <Text className="text-white text-center text-lg">Create Profile</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default CreateDogProfileScreen;
