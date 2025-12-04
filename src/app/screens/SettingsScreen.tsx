import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../../hooks/useProfile';
import { db } from '../../lib/sqlite';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const SettingsScreen = ({ navigation }) => {
  const { profile, updateProfile, loading, clearProfile } = useProfile();
  const [name, setName] = useState(profile?.name || '');
  const [breed, setBreed] = useState(profile?.breed || '');
  const [age, setAge] = useState(profile?.age.toString() || '');
  const [weight, setWeight] = useState(profile?.weight.toString() || '');
  const [isEditing, setIsEditing] = useState(false);
  const [credits, setCredits] = useState<{used: number, limit: number} | null>(null);

  React.useEffect(() => {
    const checkCredits = () => {
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const result = db.getFirstSync<{ count: number }>(
          `SELECT COUNT(*) as count FROM ai_analysis a 
           JOIN poo_logs p ON a.poo_log_id = p.id 
           WHERE strftime('%Y-%m', p.created_at) = ?`,
          [currentMonth]
        );
        setCredits({ used: result?.count || 0, limit: 35 });
      } catch (e) {
        console.error("Error checking credits:", e);
      }
    };

    const unsubscribe = navigation.addListener('focus', checkCredits);
    checkCredits(); // Run immediately on mount
    return unsubscribe;
  }, [navigation]);

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

  const clearAllData = async () => {
    try {
      db.runSync('DELETE FROM poo_logs;');
      db.runSync('DELETE FROM ai_analysis;');
      await clearProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation happens automatically via AppNavigator when profile becomes null
    } catch (error) {
      console.error("Failed to clear data", error);
      Alert.alert('Error', 'Could not clear all data.');
    }
  };

  const deleteOldData = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Old Data',
      'Are you sure you want to delete logs older than 30 days? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            try {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              const dateStr = thirtyDaysAgo.toISOString();
              
              const logsToDelete = db.getAllSync<{id: string}>(`SELECT id FROM poo_logs WHERE created_at < ?`, [dateStr]);
              const ids = logsToDelete.map(l => l.id);
              
              if (ids.length === 0) {
                Alert.alert('Info', 'No logs older than 30 days found.');
                return;
              }

              ids.forEach(id => {
                 db.runSync('DELETE FROM ai_analysis WHERE poo_log_id = ?', [id]);
                 db.runSync('DELETE FROM poo_logs WHERE id = ?', [id]);
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', `Deleted ${ids.length} old logs.`);
            } catch (error) {
              console.error("Failed to delete old data", error);
              Alert.alert('Error', 'Could not delete old data.');
            }
          } 
        },
      ]
    );
  };

  const openLink = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(url);
  }

  const appVersion = Constants.expoConfig?.version;

  const SettingItem = ({ icon, label, onPress, isDestructive = false, showChevron = true }) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center py-4 border-b border-border last:border-b-0"
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${isDestructive ? 'bg-error/10' : 'bg-surface_highlight'}`}>
        <Ionicons name={icon} size={20} color={isDestructive ? Colors.error : Colors.text_primary} />
      </View>
      <Text className={`flex-1 text-base font-medium ${isDestructive ? 'text-error' : 'text-text_primary'}`}>
        {label}
      </Text>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={Colors.text_muted} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 border-b border-border bg-surface">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={Colors.text_primary} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-text_primary">Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-text_primary">Dog Profile</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsEditing(true);
              }}>
                <Text className="text-primary font-bold">Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View className="bg-surface p-6 rounded-3xl shadow-sm border border-border">
            <View className="mb-4">
              <Text className="text-text_secondary text-sm mb-1 ml-1">Name</Text>
              <TextInput
                className={`w-full h-14 px-4 rounded-2xl text-text_primary text-base ${isEditing ? 'bg-background border border-primary' : 'bg-surface_highlight border-0'}`}
                value={name}
                onChangeText={setName}
                placeholder="Dog's Name"
                editable={isEditing}
                textAlignVertical="center"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-text_secondary text-sm mb-1 ml-1">Breed</Text>
              <TextInput
                className={`w-full h-14 px-4 rounded-2xl text-text_primary text-base ${isEditing ? 'bg-background border border-primary' : 'bg-surface_highlight border-0'}`}
                value={breed}
                onChangeText={setBreed}
                placeholder="e.g., Golden Retriever"
                editable={isEditing}
                textAlignVertical="center"
              />
            </View>

            <View className="flex-row space-x-4">
              <View className="flex-1 mb-4 mr-2">
                <Text className="text-text_secondary text-sm mb-1 ml-1">Age</Text>
                <TextInput
                  className={`w-full h-14 px-4 rounded-2xl text-text_primary text-base ${isEditing ? 'bg-background border border-primary' : 'bg-surface_highlight border-0'}`}
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g., 5"
                  keyboardType="number-pad"
                  editable={isEditing}
                  textAlignVertical="center"
                />
              </View>
              <View className="flex-1 mb-4 ml-2">
                <Text className="text-text_secondary text-sm mb-1 ml-1">Weight (kg)</Text>
                <TextInput
                  className={`w-full h-14 px-4 rounded-2xl text-text_primary text-base ${isEditing ? 'bg-background border border-primary' : 'bg-surface_highlight border-0'}`}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g., 25"
                  keyboardType="decimal-pad"
                  editable={isEditing}
                  textAlignVertical="center"
                />
              </View>
            </View>

            {isEditing && (
              <View className="flex-row mt-2">
                <TouchableOpacity
                  className="flex-1 bg-primary p-4 rounded-2xl mr-2 items-center shadow-lg shadow-primary/30"
                  onPress={handleUpdateProfile}
                >
                  <Text className="text-white font-bold text-base">Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-surface border border-border p-4 rounded-2xl ml-2 items-center"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsEditing(false);
                    setName(profile?.name || '');
                    setBreed(profile?.breed || '');
                    setAge(profile?.age.toString() || '');
                    setWeight(profile?.weight.toString() || '');
                  }}
                >
                  <Text className="text-text_primary font-bold text-base">Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-lg font-bold text-text_primary mb-2">Usage</Text>
          <View className="bg-surface rounded-3xl px-4 shadow-sm border border-border">
             <View className="flex-row items-center py-4">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-4 bg-surface_highlight">
                    <Ionicons name="sparkles-outline" size={20} color={Colors.primary} />
                </View>
                <Text className="flex-1 text-base font-medium text-text_primary">
                    Monthly AI Credits
                </Text>
                <Text className="text-base text-text_secondary font-bold">
                    {credits ? `${Math.max(0, credits.limit - credits.used)} / ${credits.limit}` : '...'}
                </Text>
             </View>
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-lg font-bold text-text_primary mb-2">Data Management</Text>
          <Text className="text-text_secondary text-sm mb-4 leading-5">
            All your data is stored locally on this device. We do not currently store your logs in the cloud, so please be careful when clearing data.
          </Text>
          <View className="bg-surface rounded-3xl px-4 shadow-sm border border-border">
            <SettingItem 
              icon="time-outline" 
              label="Delete Data > 30 Days" 
              onPress={deleteOldData} 
              isDestructive={true}
              showChevron={false}
            />
            <SettingItem 
              icon="trash-outline" 
              label="Clear All App Data" 
              onPress={confirmClearData} 
              isDestructive={true}
              showChevron={false}
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-lg font-bold text-text_primary mb-4">Legal & Support</Text>
          <View className="bg-surface rounded-3xl px-4 shadow-sm border border-border">
            <SettingItem 
              icon="shield-checkmark-outline" 
              label="Privacy Policy" 
              onPress={() => openLink('https://ohcrap.com.au/policies/privacy-policy')} 
            />
            <SettingItem 
              icon="document-text-outline" 
              label="Terms of Service" 
              onPress={() => openLink('https://ohcrap.com.au/policies/terms-of-service')} 
            />
            <SettingItem 
              icon="help-circle-outline" 
              label="Help & Support" 
              onPress={() => openLink('https://ohcrap.com.au/pages/contact')} 
            />
          </View>
        </View>

        <Text className="text-center text-text_muted mb-8">Version {appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
