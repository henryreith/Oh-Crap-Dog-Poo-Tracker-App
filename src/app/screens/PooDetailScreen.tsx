import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { db } from '../../../lib/sqlite';
import { PooLog, AIAnalysis } from '../../../types';
import * as Haptics from 'expo-haptics';

const PooDetailScreen = ({ route, navigation }) => {
  const [log, setLog] = useState<PooLog | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const { logId } = route.params;

  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM poo_logs WHERE id = ?;',
        [logId],
        (_, { rows }) => {
          if (rows.length > 0) {
            setLog(rows._array[0]);
          } else {
            Alert.alert('Error', 'Could not find the specified log.');
          }
        },
        (_, error) => {
          console.error('Error loading log:', error);
          Alert.alert('Error', 'An error occurred while loading the log.');
          return false;
        }
      );
      tx.executeSql(
        'SELECT * FROM ai_analysis WHERE poo_log_id = ?;',
        [logId],
        (_, { rows }) => {
          if (rows.length > 0) {
            setAnalysis(rows._array[0]);
          }
        },
        (_, error) => {
          console.error('Error loading AI analysis:', error);
          // Don't alert here, as analysis might not exist
          return false;
        }
      );
    }, false, () => setLoading(false));
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
            db.transaction(tx => {
              tx.executeSql('DELETE FROM poo_logs WHERE id = ?;', [logId]);
              tx.executeSql('DELETE FROM ai_analysis WHERE poo_log_id = ?;', [logId]);
            }, (error) => {
              console.error('Error deleting log:', error);
              Alert.alert('Error', 'Could not delete the log.');
            }, () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Deleted', 'The log has been successfully deleted.');
              navigation.goBack();
            });
          },
          style: 'destructive'
        }
      ]
    );
  };

  const renderAnalysisDetail = (title: string, value: string | number | undefined, isJson: boolean = false) => {
    let displayValue = value;
    if (isJson && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        displayValue = Object.entries(parsed).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join('\n');
      } catch (e) {
        // Not a valid JSON string, display as is
      }
    }

    return (
      <View className="p-4 border-b border-border">
        <Text className="text-lg font-bold text-text_primary capitalize">{title.replace(/_/g, ' ')}</Text>
        <Text className="text-text_secondary mt-1">{displayValue}</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-primary p-3 rounded-lg">
          <Text className="text-text_on_primary font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {log.photo_uri && (
          <Image source={{ uri: log.photo_uri }} className="w-full h-64" resizeMode="cover" />
        )}
        <View className="p-4">
          <Text className="text-2xl font-bold text-text_primary">Log from {new Date(log.created_at).toLocaleString()}</Text>
        </View>

        <View className="p-4 bg-surface border-y border-border">
          <Text className="text-xl font-bold text-text_primary mb-2">Manual Log Details</Text>
          {renderAnalysisDetail('Consistency Score', log.consistency_score)}
          {renderAnalysisDetail('Color', log.color.replace(/_/g, ' '))}
          {renderAnalysisDetail('Mucus Present', log.mucus_present ? 'Yes' : 'No')}
          {renderAnalysisDetail('Blood Visible', log.blood_visible ? 'Yes' : 'No')}
          {renderAnalysisDetail('Worms Visible', log.worms_visible ? 'Yes' : 'No')}
          {log.notes && renderAnalysisDetail('Notes', log.notes)}
        </View>

        {analysis ? (
          <View className="p-4">
            <Text className="text-xl font-bold text-text_primary mb-2">AI Analysis</Text>
            <View className="bg-surface rounded-lg border border-border overflow-hidden">
              {renderAnalysisDetail('Classification', analysis.classification)}
              {renderAnalysisDetail('Health Score', `${analysis.health_score}/100`)}
              {renderAnalysisDetail('Gut Health Summary', analysis.gut_health_summary)}
              {renderAnalysisDetail('Shape Analysis', analysis.shape_analysis, true)}
              {renderAnalysisDetail('Texture Analysis', analysis.texture_analysis, true)}
              {renderAnalysisDetail('Color Analysis', analysis.color_analysis, true)}
              {renderAnalysisDetail('Moisture Analysis', analysis.moisture_analysis, true)}
              {renderAnalysisDetail('Parasite Check', analysis.parasite_check_results, true)}
              {renderAnalysisDetail('Flags & Observations', analysis.flags_and_observations, true)}
              {renderAnalysisDetail('Actionable Recommendations', analysis.actionable_recommendations, true)}
              {renderAnalysisDetail('Vet Flag', analysis.vet_flag ? 'Yes, consult a vet' : 'No immediate concern')}
              {renderAnalysisDetail('Confidence Score', `${Math.round(analysis.confidence_score * 100)}%`)}
            </View>
          </View>
        ) : (
          <View className="p-4 items-center my-4">
            <Text className="text-text_muted">No AI Analysis available for this log.</Text>
          </View>
        )}
        
        {/* Oh Crap CTA */}
        {analysis && (
          <View className="my-4 mx-4 p-4 bg-primary_light rounded-lg items-center border border-primary">
              <Text className="text-xl font-bold text-primary_dark text-center">Analysis Complete!</Text>
              <Text className="text-center text-primary_dark my-2">Keep your walks clean and sustainable with Oh Crap bags.</Text>
              <TouchableOpacity 
                  className="bg-primary p-4 rounded-lg mt-2 w-full shadow"
                  onPress={handleShopifyLink}
              >
                  <Text className="text-text_on_primary text-center font-bold text-lg">Shop Now - 10% Off</Text>
                  <Text className="text-green-200 text-center font-semibold">Use code: HEALTHYPUP10</Text>
              </TouchableOpacity>
          </View>
        )}

        {analysis && (
          <Text className="text-xs text-text_muted text-center p-4">
            Disclaimer: The AI analysis is for informational purposes only and is not a substitute for professional veterinary advice. Always consult your vet for health concerns.
          </Text>
        )}

        <View className="p-4">
          <TouchableOpacity
            className="bg-error p-3 rounded-lg items-center justify-center my-4"
            onPress={deleteLog}
          >
            <Text className="text-text_on_primary text-lg font-bold">Delete Log</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PooDetailScreen;
