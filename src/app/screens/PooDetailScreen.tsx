import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { db } from '../../lib/sqlite';
import { PooLog, AIAnalysis } from '../../types';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const PooDetailScreen = ({ route, navigation }) => {
  const [log, setLog] = useState<PooLog | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const { logId } = route.params;

  useEffect(() => {
    try {
      const logResult = db.getFirstSync<PooLog>('SELECT * FROM poo_logs WHERE id = ?;', [logId]);
      if (logResult) {
        setLog(logResult);
      } else {
        Alert.alert('Error', 'Could not find the specified log.');
      }

      const analysisResult = db.getFirstSync<AIAnalysis>('SELECT * FROM ai_analysis WHERE poo_log_id = ?;', [logId]);
      console.log('Fetched Analysis for Log:', logId, analysisResult ? 'Found' : 'Not Found');
      if (analysisResult) {
        setAnalysis(analysisResult);
      }
    } catch (error) {
      console.error('Error loading log details:', error);
      Alert.alert('Error', 'An error occurred while loading the log.');
    } finally {
      setLoading(false);
    }
  }, [logId]);

  const handleShopifyLink = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = 'https://ohcrap.com.au/discount/HEALTHYPUP10?utm_source=pootracker&utm_medium=app&utm_campaign=ai_analysis';
    Linking.openURL(url);
  };

  const deleteLog = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Log",
      "Are you sure you want to permanently delete this log? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => {
            try {
              db.runSync('DELETE FROM poo_logs WHERE id = ?;', [logId]);
              db.runSync('DELETE FROM ai_analysis WHERE poo_log_id = ?;', [logId]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Deleted', 'The log has been successfully deleted.');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting log:', error);
              Alert.alert('Error', 'Could not delete the log.');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const renderAnalysisDetail = (title: string, value: string | number | undefined, isJson: boolean = false) => {
    let content = <Text className="text-text_secondary mt-1 text-base">{value}</Text>;

    if (isJson && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
           content = (
             <View className="mt-1">
               {parsed.map((item, index) => (
                 <View key={index} className="flex-row items-start mb-1">
                   <Text className="text-primary mr-2">•</Text>
                   <Text className="text-text_secondary flex-1">{item}</Text>
                 </View>
               ))}
             </View>
           );
        } else if (typeof parsed === 'object' && parsed !== null) {
          content = (
            <View className="mt-1">
              {Object.entries(parsed).map(([k, v]) => (
                <View key={k} className="flex-row mb-1">
                  <Text className="text-text_primary font-semibold mr-2 capitalize">{k.replace(/_/g, ' ')}:</Text>
                  <Text className="text-text_secondary flex-1">
                    {Array.isArray(v) ? v.join(', ') : String(v)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
      } catch (e) {
        // Not a valid JSON string, display as is
      }
    }

    return (
      <View className="p-4 border-b border-border last:border-b-0">
        <Text className="text-base font-bold text-text_primary capitalize mb-1">{title.replace(/_/g, ' ')}</Text>
        {content}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!log) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center p-4">
        <Text className="text-xl text-text_muted text-center">Log not found</Text>
        <Text className="text-text_muted text-center mt-2">This log may have been deleted.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-primary p-3 rounded-2xl">
          <Text className="text-text_on_primary font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-2 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="bg-surface p-2 rounded-full border border-border mr-4">
          <Ionicons name="arrow-back" size={24} color={Colors.text_primary} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text_primary">Log Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-4 pt-4">
        {log.photo_uri && (
          <View className="shadow-lg shadow-black/20 rounded-3xl mb-6">
            <Image source={{ uri: log.photo_uri }} className="w-full h-72 rounded-3xl" resizeMode="cover" />
            <View className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-bold">{new Date(log.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        )}

        <View className="mb-6">
          <Text className="text-lg font-bold text-text_primary mb-3">Manual Details</Text>
          <View className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm">
            {renderAnalysisDetail('Consistency Score', `${log.consistency_score}/5`)}
            {renderAnalysisDetail('Color', log.color.replace(/_/g, ' '))}
            {renderAnalysisDetail('Mucus Present', log.mucus_present ? 'Yes' : 'No')}
            {renderAnalysisDetail('Blood Visible', log.blood_visible ? 'Yes' : 'No')}
            {renderAnalysisDetail('Worms Visible', log.worms_visible ? 'Yes' : 'No')}
            {log.notes && renderAnalysisDetail('Notes', log.notes)}
          </View>
        </View>

        {analysis ? (
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons name="sparkles" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text className="text-lg font-bold text-text_primary">AI Analysis</Text>
            </View>
            
            <View className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm">
              <View className="p-4 bg-primary/10 border-b border-border flex-row justify-between items-center">
                <Text className="font-bold text-primary text-lg">Health Score</Text>
                <View className="bg-primary px-3 py-1 rounded-full">
                  <Text className="text-white font-bold">{analysis.health_score}/100</Text>
                </View>
              </View>
              
              {renderAnalysisDetail('Classification', analysis.classification)}
              {renderAnalysisDetail('Gut Health Summary', analysis.gut_health_summary)}
              {renderAnalysisDetail('Shape Analysis', analysis.shape_analysis, true)}
              {renderAnalysisDetail('Texture Analysis', analysis.texture_analysis, true)}
              {renderAnalysisDetail('Color Analysis', analysis.color_analysis, true)}
              {renderAnalysisDetail('Moisture Analysis', analysis.moisture_analysis, true)}
              {renderAnalysisDetail('Parasite Check', analysis.parasite_check_results, true)}
              {renderAnalysisDetail('Flags & Observations', analysis.flags_and_observations, true)}
              {renderAnalysisDetail('Actionable Recommendations', analysis.actionable_recommendations, true)}
              
              <View className={`p-4 border-t border-border ${analysis.vet_flag ? 'bg-error/10' : 'bg-success/10'}`}>
                <Text className="font-bold mb-1 text-text_primary">Vet Recommendation</Text>
                <Text className={analysis.vet_flag ? 'text-error font-bold' : 'text-success font-bold'}>
                  {analysis.vet_flag ? '⚠️ Consult a vet' : '✅ No immediate concern'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="p-6 bg-surface rounded-3xl border border-border items-center mb-6">
            <Ionicons name="analytics-outline" size={48} color={Colors.text_muted} />
            <Text className="text-text_muted mt-2 text-center">No AI Analysis available for this log.</Text>
          </View>
        )}
        
        {/* Oh Crap CTA */}
        {analysis && (
          <View className="mb-6 p-6 bg-primary_light rounded-3xl items-center border border-primary shadow-sm">
              <Image 
                source={require('../../../assets/images/logo.png')} 
                className="w-16 h-16 rounded-2xl mb-4"
                style={{ tintColor: Colors.primary }} // Optional tint if icon is monochrome
              />
              <Text className="text-xl font-bold text-primary_dark text-center mb-2">Analysis Complete!</Text>
              <Text className="text-center text-primary_dark mb-4">Keep your walks clean and sustainable with Oh Crap bags.</Text>
              <TouchableOpacity 
                  className="bg-primary p-4 rounded-2xl w-full shadow-lg shadow-primary/30"
                  onPress={handleShopifyLink}
              >
                  <Text className="text-text_on_primary text-center font-bold text-lg">Shop Now - 10% Off</Text>
                  <Text className="text-green-100 text-center font-semibold text-sm mt-1">Use code: HEALTHYPUP10</Text>
              </TouchableOpacity>
          </View>
        )}

        {analysis && (
          <Text className="text-xs text-text_muted text-center px-4 mb-8">
            Disclaimer: The AI analysis is for informational purposes only and is not a substitute for professional veterinary advice. Always consult your vet for health concerns.
          </Text>
        )}

        <TouchableOpacity
          className="bg-surface border border-error p-4 rounded-2xl items-center justify-center mb-12"
          onPress={deleteLog}
        >
          <Text className="text-error text-lg font-bold">Delete Log</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PooDetailScreen;
