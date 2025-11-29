import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { db } from '../../lib/sqlite';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const RetakePromptScreen = ({ navigation, route }) => {
  const { logId, photoUri, publicPhotoUrl, logData, analysisData } = route.params;

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Go back to LogPooScreen, which should already have the photo URI
    navigation.goBack();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Save the log with the manual data and the low-confidence analysis
    try {
      // 1. Save the main log entry
      db.runSync(
        'INSERT INTO poo_logs (id, consistency_score, color, mucus_present, blood_visible, worms_visible, notes, photo_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [logId, logData.consistency, logData.color, logData.mucus, logData.blood, logData.worms, logData.notes, photoUri]
      );

      // 2. Save the low-confidence AI analysis
      db.runSync(
        'INSERT INTO ai_analysis (id, poo_log_id, classification, health_score, gut_health_summary, shape_analysis, texture_analysis, color_analysis, moisture_analysis, parasite_check_results, flags_and_observations, actionable_recommendations, vet_flag, confidence_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), logId, analysisData.classification, analysisData.health_score, analysisData.gut_health_summary, JSON.stringify(analysisData.detailed_breakdown.shape), JSON.stringify(analysisData.detailed_breakdown.texture), JSON.stringify(analysisData.detailed_breakdown.colour), JSON.stringify(analysisData.detailed_breakdown.moisture_and_hydration), JSON.stringify(analysisData.detailed_breakdown.parasite_check), JSON.stringify(analysisData.flags_and_observations), JSON.stringify(analysisData.actionable_recommendations), analysisData.vet_flag, analysisData.confidence_score]
      );

      // On success, navigate back to the home screen
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.popToTop(); // Go back to the root of the stack (HomeScreen)
    } catch (error) {
      console.error("Error saving log from RetakeScreen:", error);
      // Handle transaction error if needed
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-black/60 p-6">
      <View className="bg-surface rounded-3xl p-8 w-full max-w-sm items-center shadow-2xl">
        <View className="bg-primary/10 p-4 rounded-full mb-4">
          <Ionicons name="camera-outline" size={48} color={Colors.primary} />
        </View>
        
        <Text className="text-2xl font-bold text-center mb-2 text-text_primary">Let's try that again</Text>
        <Text className="text-base text-text_secondary text-center mb-6">
          We couldn't get a clear enough view. (Confidence: {Math.round(analysisData.confidence_score * 100)}%).
        </Text>

        <View className="self-start w-full mb-8 bg-background p-5 rounded-2xl border border-border">
          <Text className="font-bold text-lg mb-3 text-text_primary">Tips for better photos:</Text>
          <View className="flex-row items-center mb-2">
            <Ionicons name="sunny-outline" size={18} color={Colors.text_secondary} style={{ marginRight: 8 }} />
            <Text className="text-text_secondary">Use natural daylight</Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Ionicons name="scan-outline" size={18} color={Colors.text_secondary} style={{ marginRight: 8 }} />
            <Text className="text-text_secondary">Fill the frame with the poo</Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Ionicons name="contrast-outline" size={18} color={Colors.text_secondary} style={{ marginRight: 8 }} />
            <Text className="text-text_secondary">Avoid shadows and glare</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="aperture-outline" size={18} color={Colors.text_secondary} style={{ marginRight: 8 }} />
            <Text className="text-text_secondary">Make sure it's in focus</Text>
          </View>
        </View>

        <TouchableOpacity
          className="bg-primary w-full p-4 rounded-2xl mb-3 shadow-lg shadow-primary/30"
          onPress={handleRetake}
        >
          <Text className="text-text_on_primary text-center text-lg font-bold">Retake Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-surface border border-border w-full p-4 rounded-2xl"
          onPress={handleSkip}
        >
          <Text className="text-text_primary text-center text-lg font-bold">Save Log Anyway</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RetakePromptScreen;
