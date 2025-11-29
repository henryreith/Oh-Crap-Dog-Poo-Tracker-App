import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { PooLog } from '../../types';
import { db } from '../../lib/sqlite';
import { supabase } from '../../lib/supabase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

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

const getColorHex = (colorValue: string) => {
  switch (colorValue) {
    case 'normal_brown': return '#8D6E63';
    case 'greenish': return '#558B2F';
    case 'yellow_orange': return '#FFB74D';
    case 'greasy_gray': return '#9E9E9E';
    case 'black_tarry': return '#212121';
    case 'red_streaks': return '#D32F2F';
    default: return '#8D6E63';
  }
};

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
  const [showManualEntry, setShowManualEntry] = useState(false);

  const pickImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Request permission first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work! Please go to Settings > Privacy > Photos and enable access.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // Lower quality for faster uploads
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Could not open image gallery. Please try again.");
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
            // Extract specific error message if possible
            const errorMessage = analysisError.message || JSON.stringify(analysisError);
            throw new Error(`AI Function Error: ${errorMessage}`);
        };

        if (analysisData?.error) {
            throw new Error(`AI Error: ${analysisData.error}`);
        }
        
        const analysis = analysisData?.poo_analysis;

        if (!analysis) {
          throw new Error("Invalid AI response. Please ensure the 'analyze-poo' function is deployed.");
        }

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
        try {
          db.runSync(
            'INSERT INTO ai_analysis (id, poo_log_id, classification, health_score, gut_health_summary, shape_analysis, texture_analysis, color_analysis, moisture_analysis, parasite_check_results, flags_and_observations, actionable_recommendations, vet_flag, confidence_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), logId, analysis.classification, analysis.health_score, analysis.gut_health_summary, JSON.stringify(analysis.detailed_breakdown.shape), JSON.stringify(analysis.detailed_breakdown.texture), JSON.stringify(analysis.detailed_breakdown.colour), JSON.stringify(analysis.detailed_breakdown.moisture_and_hydration), JSON.stringify(analysis.detailed_breakdown.parasite_check), JSON.stringify(analysis.flags_and_observations), JSON.stringify(analysis.actionable_recommendations), analysis.vet_flag, analysis.confidence_score]
          );
        } catch (error) {
          console.error("Error saving AI analysis:", error);
          // This error is logged, but we still proceed to save the main log
        }

      } catch (error) {
        console.error('AI Analysis Process Error:', error);
        Alert.alert(
            'AI Analysis Failed', 
            `${error.message} Your log will be saved without the AI analysis. Please check your network connection.`
        );
      }
    }

    // Save the poo log itself
    try {
      db.runSync(
        'INSERT INTO poo_logs (id, consistency_score, color, mucus_present, blood_visible, worms_visible, notes, photo_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [logId, consistency, color, mucus, blood, worms, notes, photoUri]
      );
      setIsLoading(false);
      if (!analysisSkipped) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Log Saved!', 'Your poo log has been successfully saved.');
        navigation.goBack();
      }
    } catch (error) {
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Could not save your log. Please try again.');
      console.error(error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
       <Modal
        transparent={true}
        animationType="fade"
        visible={isLoading}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-surface p-8 rounded-3xl items-center shadow-2xl w-3/4">
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="mt-4 text-lg font-medium text-center text-text_primary">{loadingMessage}</Text>
          </View>
        </View>
      </Modal>

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        {!photoUri ? (
          <View className="mb-8 mt-4">
            <Text className="text-3xl font-bold text-center text-text_primary mb-2">Let's check that poo!</Text>
            <Text className="text-center text-text_secondary mb-8 text-base">AI Analysis is the best way to track health.</Text>
            
            <TouchableOpacity
              className="bg-primary p-8 rounded-3xl mb-4 shadow-lg shadow-primary/30 items-center"
              onPress={takePhoto}
              disabled={isLoading}
            >
              <View className="bg-white/20 p-4 rounded-full mb-3">
                <Ionicons name="camera" size={48} color="white" />
              </View>
              <Text className="text-text_on_primary text-center text-xl font-bold">Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-surface border border-border p-6 rounded-3xl mb-8 items-center"
              onPress={pickImage}
              disabled={isLoading}
            >
              <Ionicons name="images-outline" size={32} color={Colors.primary} />
              <Text className="text-primary text-center text-lg font-bold mt-2">Select from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowManualEntry(!showManualEntry)}
              className="p-4"
            >
              <Text className="text-center text-text_muted underline">
                {showManualEntry ? "Hide manual entry" : "Log manually without photo"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mb-6">
            <View className="shadow-lg shadow-black/20 rounded-3xl mb-6">
              <Image source={{ uri: photoUri }} className="w-full h-80 rounded-3xl" resizeMode="cover" />
              <TouchableOpacity 
                className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"
                onPress={() => setPhotoUri(null)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              className="bg-primary p-5 rounded-2xl mb-4 shadow-lg shadow-primary/30 flex-row justify-center items-center"
              onPress={() => handleSave(true)}
              disabled={isLoading}
            >
              <Ionicons name="sparkles" size={24} color="white" style={{ marginRight: 8 }} />
              <Text className="text-text_on_primary text-center text-xl font-bold">Analyze with AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-surface border border-border p-4 rounded-2xl items-center mb-4"
              onPress={() => setShowManualEntry(!showManualEntry)}
              disabled={isLoading}
            >
              <Text className="text-text_primary font-semibold text-base">{showManualEntry ? "Hide Details" : "Add Manual Details"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {(showManualEntry || (photoUri && showManualEntry)) && (
          <View className="animate-fade-in pb-10">
            <View className="mb-6 p-5 bg-surface rounded-3xl border border-border shadow-sm">
              <Text className="text-lg font-bold mb-4 text-text_primary">Consistency</Text>
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
                  <Text key={key} className={`text-xs ${parseInt(key) === consistency ? 'text-primary font-bold' : 'text-text_secondary'}`}>
                    {label}
                  </Text>
                ))}
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-bold mb-3 text-text_primary ml-1">Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                {colorOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    className={`p-3 rounded-3xl mr-3 items-center justify-center h-32 w-28 ${color === option.value ? 'bg-primary_light border-2 border-primary' : 'bg-surface border border-border'}`}
                    onPress={() => setColor(option.value)}
                    disabled={isLoading}
                  >
                    <View 
                      style={{ backgroundColor: getColorHex(option.value) }} 
                      className="w-14 h-14 rounded-full mb-3 border border-gray-200 shadow-sm"
                    />
                    <Text className={`text-center text-xs font-medium ${color === option.value ? 'text-primary_dark' : 'text-text_primary'}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View className="mb-6 p-5 bg-surface rounded-3xl border border-border shadow-sm">
              <Text className="text-lg font-bold mb-4 text-text_primary">Additional Symptoms</Text>
              <View className="space-y-4">
                <View className="flex-row justify-between items-center border-b border-border pb-3">
                  <Text className="text-text_primary text-base">Mucus</Text>
                  <Switch
                    value={mucus}
                    onValueChange={setMucus}
                    trackColor={{ false: Colors.border, true: Colors.primary_light }}
                    thumbColor={mucus ? Colors.primary : '#f4f3f4'}
                    ios_backgroundColor={Colors.border}
                  />
                </View>
                <View className="flex-row justify-between items-center border-b border-border pb-3">
                  <Text className="text-text_primary text-base">Blood</Text>
                  <Switch
                    value={blood}
                    onValueChange={setBlood}
                    trackColor={{ false: Colors.border, true: Colors.primary_light }}
                    thumbColor={blood ? Colors.primary : '#f4f3f4'}
                    ios_backgroundColor={Colors.border}
                  />
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-text_primary text-base">Worms</Text>
                  <Switch
                    value={worms}
                    onValueChange={setWorms}
                    trackColor={{ false: Colors.border, true: Colors.primary_light }}
                    thumbColor={worms ? Colors.primary : '#f4f3f4'}
                    ios_backgroundColor={Colors.border}
                  />
                </View>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-bold mb-3 text-text_primary ml-1">Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                className="border border-border bg-surface rounded-3xl p-5 text-text_primary h-32 text-base"
                placeholder="Any additional notes about their diet, behavior, etc..."
                placeholderTextColor={Colors.text_muted}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Manual Save Button (only if photo not present, or if user wants to save manually) */}
            <TouchableOpacity
              className="bg-secondary p-5 rounded-2xl mb-8 shadow-lg"
              onPress={() => handleSave(false)}
              disabled={isLoading}
            >
              <Text className="text-text_on_primary text-center text-lg font-bold">Save Log Manually</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LogPooScreen;
