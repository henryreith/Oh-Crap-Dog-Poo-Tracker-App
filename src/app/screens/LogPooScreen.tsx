import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch, Image, Alert, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
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
  const [showPhotoTips, setShowPhotoTips] = useState(false);
  const [monthlyCredits, setMonthlyCredits] = useState<{used: number, limit: number} | null>(null);

  const loadingMessages = [
    "Sniffing the evidence...",
    "Consulting the Council of Canines...",
    "Analyzing texture and bouquet...",
    "Comparing to the Golden Standard...",
    "Processing poo parameters...",
    "Fetching results...",
    "Digging for answers...",
    "Calculating crunch factor...",
    "Evaluating squishiness...",
    "Decoding the doo-doo...",
    "Checking for hidden treasures...",
    "Measuring the moisture matrix...",
    "Consulting the Turd Table...",
    "Running the brown noise algorithm...",
    "Sniff testing (digitally)..."
  ];

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading && loadingMessage !== 'Saving Log...' && loadingMessage !== 'Uploading photo...') {
      let i = 0;
      interval = setInterval(() => {
        setLoadingMessage(loadingMessages[i % loadingMessages.length]);
        i++;
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLoading, loadingMessage]);

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
        setMonthlyCredits({ used: result?.count || 0, limit: 35 });
      } catch (e) {
        console.error("Error checking credits:", e);
      }
    };

    const unsubscribe = navigation.addListener('focus', checkCredits);
    checkCredits(); // Run immediately on mount
    return unsubscribe;
  }, [navigation]);

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

    if (withAi) {
      // Check monthly limit
      try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const result = db.getFirstSync<{ count: number }>(
          `SELECT COUNT(*) as count FROM ai_analysis a 
           JOIN poo_logs p ON a.poo_log_id = p.id 
           WHERE strftime('%Y-%m', p.created_at) = ?`,
          [currentMonth]
        );
        
        // Simple limit check (e.g., 35 logs per month)
        if ((result?.count || 0) >= 35) {
          Alert.alert(
            'Monthly Limit Reached', 
            'You have reached your limit of 35 AI analyses for this month. You can still log manually.',
            [
              { text: 'Log Manually', onPress: () => handleSave(false) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error checking log limit:', error);
        // Continue if check fails (fail open)
      }
    }

    setIsLoading(true);
    setLoadingMessage('Saving Log...');
    const logId = uuidv4();
    let publicPhotoUrl: string | null = null;
    let analysisSkipped = false;

    const saveLogToDb = () => {
      try {
        db.runSync(
          'INSERT INTO poo_logs (id, consistency_score, color, mucus_present, blood_visible, worms_visible, notes, photo_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [logId, consistency, color, mucus, blood, worms, notes, photoUri]
        );
      } catch (e) {
        // Ignore unique constraint errors if already saved
        if (!e.message?.includes('UNIQUE constraint failed')) {
          throw e;
        }
      }
    };

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
            image_base64: `data:image/${fileExt === 'jpg' ? 'jpeg' : fileExt};base64,${base64}`,
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

        if (analysis.confidence_score < 0.85) {
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

        // Save Log FIRST to avoid Foreign Key constraint violation
        saveLogToDb();

        // Save analysis to SQLite
        setLoadingMessage('Saving analysis...');
        try {
          console.log("Saving AI Analysis:", JSON.stringify(analysis, null, 2));
          db.runSync(
            'INSERT INTO ai_analysis (id, poo_log_id, classification, health_score, gut_health_summary, shape_analysis, texture_analysis, color_analysis, moisture_analysis, parasite_check_results, flags_and_observations, actionable_recommendations, vet_flag, confidence_score, hydration_estimate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              uuidv4(), 
              logId, 
              analysis.classification || 'Unknown', 
              analysis.health_score || 0, 
              analysis.gut_health_summary || 'No summary available', 
              JSON.stringify(analysis.detailed_breakdown?.shape || {}), 
              JSON.stringify(analysis.detailed_breakdown?.texture || {}), 
              JSON.stringify(analysis.detailed_breakdown?.colour || {}), 
              JSON.stringify(analysis.detailed_breakdown?.moisture_and_hydration || {}), 
              JSON.stringify(analysis.detailed_breakdown?.parasite_check || {}), 
              JSON.stringify(analysis.flags_and_observations || []), 
              JSON.stringify(analysis.actionable_recommendations || []), 
              analysis.vet_flag ? 1 : 0, 
              analysis.confidence_score || 0,
              JSON.stringify(analysis.hydration_estimate || {})
            ]
          );
        } catch (error) {
          console.error("Error saving AI analysis:", error);
          // This error is logged, but the log is already saved.
        }

        setIsLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Log Saved!', 'Your poo log has been successfully saved.');
        navigation.goBack();
        return;

      } catch (error) {
        console.error('AI Analysis Process Error:', error);
        setIsLoading(false);
        Alert.alert(
            'AI Analysis Failed', 
            `The AI could not analyze your log: ${error.message}\n\nPlease try again or save as a manual log.`
        );
        return; // Stop execution. Do not fall through to manual save.
      }
    }

    // Save the poo log itself (Manual Only)
    try {
      saveLogToDb();
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Log Saved', 'Your manual log has been successfully saved.');
      navigation.goBack();
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
          <View className="bg-surface p-8 rounded-3xl items-center shadow-2xl w-4/5">
            <ActivityIndicator size="large" color={Colors.primary} className="mb-6" />
            <Text className="text-xl font-bold text-center text-text_primary mb-2">
              {loadingMessage === 'Saving Log...' || loadingMessage === 'Uploading photo...' ? 'Processing...' : 'AI Analysis in Progress'}
            </Text>
            <Text className="text-base text-center text-text_secondary italic min-h-[24px]">
              {loadingMessage}
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showPhotoTips}
        onRequestClose={() => setShowPhotoTips(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPhotoTips(false)}>
            <View className="flex-1 justify-end bg-black/60">
                <TouchableWithoutFeedback onPress={() => {}}>
                    <View className="bg-background rounded-t-[40px] h-[70%] p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-bold text-text_primary">Photo Tips</Text>
                            <TouchableOpacity onPress={() => setShowPhotoTips(false)} className="bg-surface p-2 rounded-full border border-border">
                                <Ionicons name="close" size={24} color={Colors.text_primary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="py-2">
                                <View className="flex-row items-start mb-8">
                                    <View className="bg-primary/10 p-3 rounded-2xl h-14 w-14 items-center justify-center mr-5">
                                        <Ionicons name="sunny" size={28} color={Colors.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xl font-bold text-text_primary mb-1">Good Lighting</Text>
                                        <Text className="text-text_secondary text-base leading-6">Ensure the poo is well-lit. Natural daylight is best. Avoid shadows covering the subject.</Text>
                                    </View>
                                </View>

                                <View className="flex-row items-start mb-8">
                                    <View className="bg-primary/10 p-3 rounded-2xl h-14 w-14 items-center justify-center mr-5">
                                        <Ionicons name="aperture" size={28} color={Colors.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xl font-bold text-text_primary mb-1">Clear Focus</Text>
                                        <Text className="text-text_secondary text-base leading-6">Tap to focus on the poo. Blurry images make it hard for AI to see texture.</Text>
                                    </View>
                                </View>

                                <View className="flex-row items-start mb-8">
                                    <View className="bg-primary/10 p-3 rounded-2xl h-14 w-14 items-center justify-center mr-5">
                                        <Ionicons name="scan" size={28} color={Colors.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xl font-bold text-text_primary mb-1">Get Close</Text>
                                        <Text className="text-text_secondary text-base leading-6">Fill the frame with the poo, but keep enough background for context.</Text>
                                    </View>
                                </View>
                                
                                <View className="flex-row items-start mb-8">
                                    <View className="bg-primary/10 p-3 rounded-2xl h-14 w-14 items-center justify-center mr-5">
                                        <Ionicons name="trash" size={28} color={Colors.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xl font-bold text-text_primary mb-1">Clean Background</Text>
                                        <Text className="text-text_secondary text-base leading-6">Try to avoid other objects in the frame like shoes or leads.</Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity 
                                className="bg-primary p-4 rounded-2xl mt-10 mb-8 shadow-lg shadow-primary/20"
                                onPress={() => setShowPhotoTips(false)}
                            >
                                <Text className="text-text_on_primary text-center font-bold text-lg">Got it!</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        {!photoUri ? (
          <View className="mb-8 mt-4">
            <Text className="text-3xl font-bold text-center text-text_primary mb-2">Let's check that poo!</Text>
            <Text className="text-center text-text_secondary mb-6 text-base">AI Analysis is the best way to track health.</Text>
            
            {monthlyCredits && (
              <View className="bg-surface_highlight self-center px-4 py-2 rounded-full mb-8 border border-border">
                <Text className="text-text_secondary font-medium text-sm">
                  {Math.max(0, monthlyCredits.limit - monthlyCredits.used)} AI Credits Remaining
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              className="bg-primary p-8 rounded-3xl mb-6 shadow-lg shadow-primary/30 items-center"
              onPress={takePhoto}
              disabled={isLoading}
            >
              <View className="bg-white/20 p-4 rounded-full mb-3">
                <Ionicons name="camera" size={48} color="white" />
              </View>
              <Text className="text-text_on_primary text-center text-xl font-bold">Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-surface border border-border p-6 rounded-3xl mb-6 items-center"
              onPress={pickImage}
              disabled={isLoading}
            >
              <Ionicons name="images-outline" size={32} color={Colors.primary} />
              <Text className="text-primary text-center text-lg font-bold mt-2">Select from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => setShowPhotoTips(true)}
                className="flex-row items-center justify-center mb-8 py-2"
            >
                <Ionicons name="information-circle-outline" size={20} color={Colors.text_secondary} />
                <Text className="text-text_secondary font-medium ml-2">Photo tips for best AI results</Text>
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

            {monthlyCredits && (
              <Text className="text-center text-text_muted text-sm mb-4">
                {Math.max(0, monthlyCredits.limit - monthlyCredits.used)} monthly credits remaining
              </Text>
            )}

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
            {!photoUri && (
              <View className="mb-6">
                <Text className="text-lg font-bold mb-3 text-text_primary ml-1">Add Photo (Optional)</Text>
                <View className="flex-row">
                  <TouchableOpacity 
                    onPress={takePhoto}
                    className="flex-1 bg-surface border border-border p-4 rounded-2xl items-center flex-row justify-center mr-2"
                  >
                    <Ionicons name="camera-outline" size={24} color={Colors.text_primary} style={{marginRight: 8}}/>
                    <Text className="text-text_primary font-semibold">Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={pickImage}
                    className="flex-1 bg-surface border border-border p-4 rounded-2xl items-center flex-row justify-center ml-2"
                  >
                    <Ionicons name="images-outline" size={24} color={Colors.text_primary} style={{marginRight: 8}}/>
                    <Text className="text-text_primary font-semibold">Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
