import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../../../hooks/useProfile';
import { db } from '../../../lib/sqlite';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

const SettingsScreen = ({ navigation }) => {
  const { profile, updateProfile, loading } = useProfile();
  const [name, setName] = useState(profile?.name || '');
  const [breed, setBreed] = useState(profile?.breed || '');
  const [age, setAge] = useState(profile?.age.toString() || '');
  const [weight, setWeight] = useState(profile?.weight.toString() || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await updateProfile({
        ...profile,
        name,
        breed,
        age: parseInt(age, 10),
        weight: parseFloat(weight),
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const confirmClearData = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all data? This includes your profile and all logs. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: clearAllData },
      ]
    );
  };

  const clearAllData = () => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM poo_logs;');
      tx.executeSql('DELETE FROM ai_analysis;');
      tx.executeSql('DELETE FROM dog_profile;');
    }, (error) => {
      console.error("Failed to clear data", error);
      Alert.alert('Error', 'Could not clear all data.');
    }, () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Data Cleared', 'All application data has been removed.', [
        { text: 'OK', onPress: () => navigation.navigate('Onboarding') },
      ]);
    });
  };

  const openLink = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(url);
  }

  const appVersion = Constants.expoConfig?.version;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-text_primary mb-6">Settings</Text>

        <View className="mb-6 p-4 bg-surface rounded-lg border border-border">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-text_primary">Dog Profile</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsEditing(true);
              }}>
                <Text className="text-primary font-bold">Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Text className="text-text_secondary mb-1">Name</Text>
          <TextInput
            className={`w-full p-3 rounded-md mb-3 text-text_primary ${isEditing ? 'bg-white border border-border' : 'bg-background'}`}
            value={name}
            onChangeText={setName}
            placeholder="Dog's Name"
            editable={isEditing}
          />
          <Text className="text-text_secondary mb-1">Breed</Text>
          <TextInput
            className={`w-full p-3 rounded-md mb-3 text-text_primary ${isEditing ? 'bg-white border border-border' : 'bg-background'}`}
            value={breed}
            onChangeText={setBreed}
            placeholder="e.g., Golden Retriever"
            editable={isEditing}
          />
          <Text className="text-text_secondary mb-1">Age</Text>
          <TextInput
            className={`w-full p-3 rounded-md mb-3 text-text_primary ${isEditing ? 'bg-white border border-border' : 'bg-background'}`}
            value={age}
            onChangeText={setAge}
            placeholder="e.g., 5"
            keyboardType="number-pad"
            editable={isEditing}
          />
          <Text className="text-text_secondary mb-1">Weight (kg)</Text>
          <TextInput
            className={`w-full p-3 rounded-md text-text_primary ${isEditing ? 'bg-white border border-border' : 'bg-background'}`}
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g., 25"
            keyboardType="decimal-pad"
            editable={isEditing}
          />

          {isEditing && (
            <View className="flex-row mt-4">
              <TouchableOpacity
                className="flex-1 bg-primary p-3 rounded-lg mr-2 items-center"
                onPress={handleUpdateProfile}
              >
                <Text className="text-white font-bold">Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-border p-3 rounded-lg ml-2 items-center"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsEditing(false);
                  // Reset fields to profile state
                  setName(profile?.name || '');
                  setBreed(profile?.breed || '');
                  setAge(profile?.age.toString() || '');
                  setWeight(profile?.weight.toString() || '');
                }}
              >
                <Text className="text-text_primary font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="mb-6 p-4 bg-surface rounded-lg border border-border">
          <Text className="text-xl font-bold text-text_primary mb-4">Legal</Text>
          <TouchableOpacity onPress={() => openLink('https://ohcrap.com.au/policies/privacy-policy')}>
            <Text className="text-secondary text-lg mb-2">Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLink('https://ohcrap.com.au/policies/terms-of-service')}>
            <Text className="text-secondary text-lg">Terms of Service</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-6 p-4 bg-surface rounded-lg border border-border">
          <Text className="text-xl font-bold text-text_primary mb-4">Data Management</Text>
          <TouchableOpacity
            className="bg-error p-4 rounded-lg items-center"
            onPress={confirmClearData}
          >
            <Text className="text-white font-bold text-lg">Clear All App Data</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-center text-text_muted p-4">App Version: {appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
