import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { PooLog } from '../../../types';
import { db } from '../../../lib/sqlite';
import { supabase } from '../../../lib/supabase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../../constants/Colors';

const consistencyLabels = {
  1: 'Very Loose',
  2: 'Loose',
  3: 'Normal',
  4: 'Firm',
  5: 'Hard',
};

const colorOptions = [
  { label: 'Normal Brown', value: 'normal_brown' },
  { label: 'Greenish', value: 'greenish' },
  { label: 'Yellow-Orange', value: 'yellow_orange' },
  { label: 'Greasy Gray', value: 'greasy_gray' },
  { label: 'Black Tarry', value: 'black_tarry' },
  { label: 'Red Streaks', value: 'red_streaks' },
];

const LogPooScreen = ({ navigation }) => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [consistency, setConsistency] = useState(4);
  const [color, setColor] = useState<'normal_brown' | 'greenish' | 'yellow_orange' | 'greasy_gray' | 'black_tarry' | 'red_streaks'>('normal_brown');
  const [mucus, setMucus] = useState(false);
  const [blood, setBlood] = useState(false);
  const [worms, setWorms] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Saving Log...');

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Lower quality for faster uploads
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("You've refused to allow this app to access your camera!");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async (withAi: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsLoading(true);
    setLoadingMessage('Saving Log...');
    const logId = uuidv4();
    let publicPhotoUrl: string | null = null;
    let analysisSkipped = false;

    if (withAi && photoUri) {
      try {
        setLoadingMessage('Uploading photo...');
        const fileExt = photoUri.split('.').pop();
        const fileName = `${logId}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('poo-photos')
          .upload(filePath, decode(base64), { contentType: `image/${fileExt}` });

        if (uploadError) {
            console.error("Upload Error:", uploadError);
            throw new Error("Failed to upload photo.");
        };

        const { data: urlData } = supabase.storage.from('poo-photos').getPublicUrl(filePath);
        publicPhotoUrl = urlData.publicUrl;

        setLoadingMessage('Analyzing poo with AI...');
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-poo', {
          body: {
            photo_url: publicPhotoUrl,
            consistency_score: consistency,
            colour_code: color,
            mucus_present: mucus,
            blood_visible: blood,
            worms_visible: worms,
            notes: notes,
          },
        });

        if (analysisError) {
            console.error("Analysis Error:", analysisError);
            throw new Error("The AI analysis function failed.");
        };
        
        const analysis = analysisData.poo_analysis;

        if (analysis.confidence_score < 0.9) {
          analysisSkipped = true;
          // Navigate to RetakePromptScreen which will handle the rest
          navigation.navigate('RetakePrompt', {
            logId: logId,
            photoUri: photoUri,
            publicPhotoUrl: publicPhotoUrl,
            logData: { consistency, color, mucus, blood, worms, notes },
            analysisData: analysis, // Pass the low-confidence analysis
          });
          setIsLoading(false); // Turn off loading indicator on this screen
          return; // Stop execution here
        }

        // Save analysis to SQLite
        setLoadingMessage('Saving analysis...');
        db.transaction(tx => {
          tx.executeSql(
            'INSERT INTO ai_analysis (id, poo_log_id, classification, health_score, gut_health_summary, shape_analysis, texture_analysis, color_analysis, moisture_analysis, parasite_check_results, flags_and_observations, actionable_recommendations, vet_flag, confidence_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), logId, analysis.classification, analysis.health_score, analysis.gut_health_summary, JSON.stringify(analysis.detailed_breakdown.shape), JSON.stringify(analysis.detailed_breakdown.texture), JSON.stringify(analysis.detailed_breakdown.colour), JSON.stringify(analysis.detailed_breakdown.moisture_and_hydration), JSON.stringify(analysis.detailed_breakdown.parasite_check), JSON.stringify(analysis.flags_and_observations), JSON.stringify(analysis.actionable_recommendations), analysis.vet_flag, analysis.confidence_score],
            () => {},
            (_, error) => {
              console.error("Error saving AI analysis:", error);
              // This error is logged, but we still proceed to save the main log
              return false;
            }
          );
        });

      } catch (error) {
        console.error('AI Analysis Process Error:', error);
        Alert.alert(
            'AI Analysis Failed', 
            `${error.message} Your log will be saved without the AI analysis. Please check your network connection.`
        );
      }
    }

    // Save the poo log itself
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO poo_logs (id, consistency_score, color, mucus_present, blood_visible, worms_visible, notes, photo_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [logId, consistency, color, mucus, blood, worms, notes, photoUri],
        () => {
          setIsLoading(false);
          if (!analysisSkipped) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Log Saved!', 'Your poo log has been successfully saved.');
            navigation.goBack();
          }
        },
        (_, error) => {
          setIsLoading(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Error', 'Could not save your log. Please try again.');
          console.error(error);
          return false;
        }
      );
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
       <Modal
        transparent={true}
        animationType="fade"
        visible={isLoading}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-surface p-8 rounded-lg items-center shadow-lg">
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="mt-4 text-lg text-center text-text_secondary">{loadingMessage}</Text>
          </View>
        </View>
      </Modal>

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        <View className="mb-4">
          <Text className="text-lg font-semibold mb-2 text-text_primary">Photo (Optional)</Text>
          <View className="flex-row">
            <TouchableOpacity
              className="bg-secondary p-4 rounded-lg mr-2 flex-1 items-center justify-center"
              onPress={takePhoto}
              disabled={isLoading}
            >
              <Text className="text-text_on_primary text-center text-lg font-bold">Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-surface border border-border p-4 rounded-lg flex-1 items-center justify-center"
              onPress={pickImage}
              disabled={isLoading}
            >
              <Text className="text-text_primary text-center text-lg font-bold">From Gallery</Text>
            </TouchableOpacity>
          </View>
          {photoUri && (
            <Image source={{ uri: photoUri }} className="mt-4 w-full h-48 rounded-lg" resizeMode="cover" />
          )}
        </View>

        <View className="mb-4 p-4 bg-surface rounded-lg border border-border">
          <Text className="text-lg font-semibold mb-2 text-text_primary">Consistency</Text>
          <Slider
            value={consistency}
            onValueChange={setConsistency}
            minimumValue={1}
            maximumValue={5}
            step={1}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.primary}
          />
          <View className="flex-row justify-between mt-2 px-1">
            {Object.entries(consistencyLabels).map(([key, label]) => (
              <Text key={key} className="text-xs text-text_secondary">
                {label}
              </Text>
            ))}
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-lg font-semibold mb-2 text-text_primary">Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
            {colorOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                className={`p-3 rounded-lg mr-2 items-center justify-center h-24 w-24 ${color === option.value ? 'bg-secondary' : 'bg-surface border border-border'}`}
                onPress={() => setColor(option.value)}
                disabled={isLoading}
              >
                <Text className={`text-center font-medium ${color === option.value ? 'text-text_on_primary' : 'text-text_primary'}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="mb-4 p-4 bg-surface rounded-lg border border-border">
          <Text className="text-lg font-semibold mb-2 text-text_primary">Additional Symptoms</Text>
          <View className="flex-row justify-around pt-2">
            <View className="items-center">
              <Text className="text-text_secondary mb-2">Mucus</Text>
              <Switch
                value={mucus}
                onValueChange={setMucus}
                trackColor={{ false: Colors.border, true: Colors.primary_light }}
                thumbColor={Colors.primary}
                ios_backgroundColor={Colors.border}
              />
            </View>
            <View className="items-center">
              <Text className="text-text_secondary mb-2">Blood</Text>
              <Switch
                value={blood}
                onValueChange={setBlood}
                trackColor={{ false: Colors.border, true: Colors.primary_light }}
                thumbColor={Colors.primary}
                ios_backgroundColor={Colors.border}
              />
            </View>
            <View className="items-center">
              <Text className="text-text_secondary mb-2">Worms</Text>
              <Switch
                value={worms}
                onValueChange={setWorms}
                trackColor={{ false: Colors.border, true: Colors.primary_light }}
                thumbColor={Colors.primary}
                ios_backgroundColor={Colors.border}
              />
            </View>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-lg font-semibold mb-2 text-text_primary">Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            className="border border-border bg-surface rounded-lg p-4 text-text_primary h-24"
            placeholder="Any additional notes about their diet, behavior, etc..."
            placeholderTextColor={Colors.text_muted}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View className="my-4">
          <TouchableOpacity
            className="bg-primary p-4 rounded-lg mb-3 shadow"
            onPress={() => handleSave(false)}
            disabled={isLoading}
          >
            <Text className="text-text_on_primary text-center text-lg font-bold">Save Log</Text>
          </TouchableOpacity>
          {photoUri && (
            <TouchableOpacity
              className="bg-secondary p-4 rounded-lg shadow"
              onPress={() => handleSave(true)}
              disabled={isLoading}
            >
              <Text className="text-text_on_primary text-center text-lg font
