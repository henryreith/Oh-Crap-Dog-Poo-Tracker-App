import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Linking, Modal, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '../../lib/sqlite';
import { PooLog, AIAnalysis } from '../../types';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Config } from '../../constants/Config';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

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
  { label: 'Other', value: 'other' },
];

const getColorHex = (colorValue: string) => {
  switch (colorValue) {
    case 'normal_brown': return '#8D6E63';
    case 'greenish': return '#558B2F';
    case 'yellow_orange': return '#FFB74D';
    case 'greasy_gray': return '#9E9E9E';
    case 'black_tarry': return '#212121';
    case 'red_streaks': return '#D32F2F';
    case 'other': return '#E0E0E0';
    default: return '#8D6E63';
  }
};

const PooDetailScreen = ({ route, navigation }) => {
  const [log, setLog] = useState<PooLog | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isManualDetailsExpanded, setIsManualDetailsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  
  // Edit State
  const [editConsistency, setEditConsistency] = useState(4);
  const [editColor, setEditColor] = useState('normal_brown');
  const [editOtherColor, setEditOtherColor] = useState('');
  const [editMucus, setEditMucus] = useState(false);
  const [editBlood, setEditBlood] = useState(false);
  const [editWorms, setEditWorms] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const { logId } = route.params;

  useEffect(() => {
    loadLogData();
  }, [logId]);

  const loadLogData = () => {
    try {
      const logResult = db.getFirstSync<PooLog>('SELECT * FROM poo_logs WHERE id = ?;', [logId]);
      if (logResult) {
        setLog(logResult);
        // Initialize edit state
        setEditConsistency(logResult.consistency_score);
        
        const isStandardColor = colorOptions.some(c => c.value === logResult.color);
        if (isStandardColor) {
          setEditColor(logResult.color);
          setEditOtherColor('');
        } else {
          setEditColor('other');
          setEditOtherColor(logResult.color);
        }

        setEditMucus(logResult.mucus_present);
        setEditBlood(logResult.blood_visible);
        setEditWorms(logResult.worms_visible);
        setEditNotes(logResult.notes || '');
      } else {
        Alert.alert('Error', 'Could not find the specified log.');
      }

      const analysisResult = db.getFirstSync<AIAnalysis>('SELECT * FROM ai_analysis WHERE poo_log_id = ?;', [logId]);
      console.log('Fetched Analysis for Log:', logId, JSON.stringify(analysisResult, null, 2));
      if (analysisResult) {
        setAnalysis(analysisResult);
        setIsManualDetailsExpanded(false);
      } else {
        setAnalysis(null);
        setIsManualDetailsExpanded(true);
      }
    } catch (error) {
      console.error('Error loading log data:', error);
      Alert.alert('Error', 'Could not load log details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManualDetails = () => {
    try {
      const finalColor = editColor === 'other' ? editOtherColor : editColor;
      db.runSync(
        'UPDATE poo_logs SET consistency_score = ?, color = ?, mucus_present = ?, blood_visible = ?, worms_visible = ?, notes = ? WHERE id = ?',
        [editConsistency, finalColor, editMucus ? 1 : 0, editBlood ? 1 : 0, editWorms ? 1 : 0, editNotes, logId]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditModalVisible(false);
      loadLogData(); // Reload data to update UI
    } catch (error) {
      console.error('Error updating log:', error);
      Alert.alert('Error', 'Could not update manual details.');
    }
  };

  const handleClearManualDetails = () => {
    Alert.alert(
      "Clear Manual Data",
      "Are you sure? This will reset all manual observations to default.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear Data", 
          style: "destructive", 
          onPress: () => {
            try {
              db.runSync(
                'UPDATE poo_logs SET consistency_score = 4, color = "normal_brown", mucus_present = 0, blood_visible = 0, worms_visible = 0, notes = "" WHERE id = ?',
                [logId]
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setIsEditModalVisible(false);
              loadLogData();
            } catch (error) {
              console.error('Error clearing log:', error);
              Alert.alert('Error', 'Could not clear manual details.');
            }
          }
        }
      ]
    );
  };

  // Heuristic to check if manual details are "present" (non-default or explicitly set)
  // For AI logs, we assume defaults mean "not set" unless notes are present or flags are raised.
  const hasManualDetails = log ? (
    log.notes || 
    log.mucus_present || 
    log.blood_visible || 
    log.worms_visible || 
    log.consistency_score !== 4 || 
    log.color !== 'normal_brown'
  ) : false;

  const handleShopifyLink = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { baseUrl, defaultUtm } = Config.shop;
    const url = `${baseUrl}?utm_source=${defaultUtm.source}&utm_medium=${defaultUtm.medium}&utm_campaign=${defaultUtm.campaign}`;
    Linking.openURL(url);
  };

  const generatePdf = async () => {
    if (!log) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const generateSectionHtml = (title: string, value: string | undefined) => {
      if (!value) return '';
      let contentHtml = '';
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          contentHtml = `<ul>${parsed.map(item => `<li>${item}</li>`).join('')}</ul>`;
        } else if (typeof parsed === 'object' && parsed !== null) {
          const { description, ...rest } = parsed;
          if (description) {
            contentHtml += `<p class="description">${description}</p>`;
          }
          Object.entries(rest).forEach(([k, v]) => {
            contentHtml += `<div class="sub-section"><strong>${k.replace(/_/g, ' ')}:</strong>`;
            if (Array.isArray(v)) {
              contentHtml += `<ul>${v.map(item => `<li>${item}</li>`).join('')}</ul>`;
            } else {
              contentHtml += ` <span class="value">${k === 'hydration_level' ? `${v}%` : v}</span>`;
            }
            contentHtml += `</div>`;
          });
        }
      } catch (e) {
        contentHtml = `<p>${value}</p>`;
      }
      return `
        <div class="section">
          <h3>${title}</h3>
          ${contentHtml}
        </div>
      `;
    };

    const manualDetailsHtml = hasManualDetails ? `
      <h2>Manual Observations</h2>
      <div class="section">
        <p><span class="label">Consistency Score:</span> <span class="value">${log.consistency_score}/5</span></p>
        <p><span class="label">Color:</span> <span class="value">${log.color.replace(/_/g, ' ')}</span></p>
        <p><span class="label">Mucus:</span> <span class="value">${log.mucus_present ? 'Yes' : 'No'}</span></p>
        <p><span class="label">Blood:</span> <span class="value">${log.blood_visible ? 'Yes' : 'No'}</span></p>
        <p><span class="label">Worms:</span> <span class="value">${log.worms_visible ? 'Yes' : 'No'}</span></p>
        ${log.notes ? `<div class="section"><h3>Notes</h3><p>${log.notes}</p></div>` : ''}
      </div>
    ` : '';

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            h1 { color: #2E7D32; font-size: 28px; margin-bottom: 10px; }
            h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 40px; font-size: 22px; }
            h3 { color: #2E7D32; font-size: 18px; margin-bottom: 10px; margin-top: 20px; text-transform: capitalize; }
            .header { text-align: center; margin-bottom: 40px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 30px; text-align: center; }
            .section { margin-bottom: 25px; page-break-inside: avoid; }
            .label { font-weight: bold; color: #444; }
            .value { color: #666; }
            .score-badge { background-color: #2E7D32; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; font-size: 18px; }
            .warning { color: #D32F2F; font-weight: bold; background-color: #FFEBEE; padding: 15px; border-radius: 10px; text-align: center; margin-top: 20px; }
            .success { color: #388E3C; font-weight: bold; background-color: #E8F5E9; padding: 15px; border-radius: 10px; text-align: center; margin-top: 20px; }
            img { max-width: 100%; height: auto; border-radius: 15px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: block; margin-left: auto; margin-right: auto; }
            ul { margin-top: 5px; padding-left: 20px; }
            li { margin-bottom: 5px; color: #555; }
            .description { margin-bottom: 10px; color: #444; }
            .sub-section { margin-bottom: 10px; }
            strong { text-transform: capitalize; color: #333; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Poo Log Report</h1>
            <p>Generated by Oh Crap Dog Poo Tracker</p>
          </div>

          <div class="meta">
            <p><strong>Date:</strong> ${new Date(log.created_at).toLocaleDateString()} ${new Date(log.created_at).toLocaleTimeString()}</p>
            <p><strong>Log ID:</strong> ${log.id}</p>
          </div>

          ${log.photo_uri ? `<img src="${log.photo_uri}" />` : ''}

          ${analysis ? `
            <h2>AI Analysis</h2>
            <div style="text-align: center; margin-bottom: 30px;">
              <p><span class="label" style="font-size: 18px;">Health Score</span></p>
              <div style="margin-top: 10px;"><span class="score-badge">${analysis.health_score}/100</span></div>
            </div>

            <div class="section">
              <h3>Classification</h3>
              <p>${analysis.classification}</p>
            </div>

            <div class="section">
              <h3>Gut Health Summary</h3>
              <p>${analysis.gut_health_summary}</p>
            </div>
            
            ${generateSectionHtml('Shape Analysis', analysis.shape_analysis)}
            ${generateSectionHtml('Texture Analysis', analysis.texture_analysis)}
            ${generateSectionHtml('Color Analysis', analysis.color_analysis)}
            ${generateSectionHtml('Moisture Analysis', analysis.moisture_analysis)}
            ${generateSectionHtml('Hydration Estimate', analysis.hydration_estimate)}
            ${generateSectionHtml('Parasite Check', analysis.parasite_check_results)}
            ${generateSectionHtml('Flags & Observations', analysis.flags_and_observations)}
            ${generateSectionHtml('Actionable Recommendations', analysis.actionable_recommendations)}
            
            <div class="${analysis.vet_flag ? 'warning' : 'success'}">
              <div style="font-size: 18px; margin-bottom: 5px;">${analysis.vet_flag ? 'Vet Recommendation' : 'Vet Check'}</div>
              <div>${analysis.vet_flag ? '⚠️ Consult a vet' : '✅ All Clear'}</div>
            </div>
          ` : ''}

          ${manualDetailsHtml}
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Could not generate PDF report.');
    }
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
    let isEmpty = false;

    if (!value) {
      isEmpty = true;
    }

    if (isJson && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
           if (parsed.length === 0) {
             isEmpty = true;
           } else {
             content = (
               <View className="mt-1">
                 {parsed.map((item, index) => (
                   <View key={index} className="flex-row items-start mb-3">
                     <Text className="text-primary mr-2 text-base">•</Text>
                     <Text className="text-text_secondary flex-1 text-base">{item}</Text>
                   </View>
                 ))}
               </View>
             );
           }
        } else if (typeof parsed === 'object' && parsed !== null) {
          if (Object.keys(parsed).length === 0) {
            isEmpty = true;
          } else {
            const { description, ...rest } = parsed;
            content = (
              <View className="mt-1">
                {description && (
                  <Text className="text-text_secondary mb-3 text-base">{description}</Text>
                )}
                {Object.entries(rest).map(([k, v]) => (
                  <View key={k} className="mb-3">
                    <Text className="text-text_primary font-semibold capitalize mb-1 text-base">{k.replace(/_/g, ' ')}</Text>
                    {Array.isArray(v) ? (
                      v.map((item, idx) => (
                        <View key={idx} className="flex-row items-start mb-2">
                          <Text className="text-primary mr-2 text-base">•</Text>
                          <Text className="text-text_secondary flex-1 text-base">{String(item)}</Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-text_secondary text-base">
                        {k === 'hydration_level' ? `${v}%` : String(v)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            );
          }
        }
      } catch (e) {
        // Not a valid JSON string, display as is
      }
    }

    if (isEmpty) return null;

    return (
      <View className="p-4 border-b border-border last:border-b-0">
        <Text className="text-lg font-bold text-text_primary capitalize mb-2">{title.replace(/_/g, ' ')}</Text>
        {content}
      </View>
    );
  };

  console.log('Render PooDetailScreen. Analysis State:', analysis ? 'Present' : 'Null');

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
      <View className="px-4 py-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="bg-surface p-2 rounded-full border border-border mr-4">
            <Ionicons name="arrow-back" size={24} color={Colors.text_primary} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-text_primary">Log Details</Text>
        </View>
        <TouchableOpacity onPress={generatePdf} className="bg-surface p-2 rounded-full border border-border">
          <Ionicons name="share-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-4 pt-4">
        {log.photo_uri && (
          <View className="shadow-lg shadow-black/20 rounded-3xl mb-6">
            <Image 
              source={{ uri: log.photo_uri }} 
              className="w-full h-80 rounded-3xl"
              resizeMode="cover"
            />
          </View>
        )}

        {analysis ? (
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons name="sparkles" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text className="text-lg font-bold text-text_primary">AI Analysis</Text>
            </View>
            
            <View className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm mb-6">
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
              {renderAnalysisDetail('Hydration Estimate', analysis.hydration_estimate, true)}
              {renderAnalysisDetail('Parasite Check', analysis.parasite_check_results, true)}
              {renderAnalysisDetail('Flags & Observations', analysis.flags_and_observations, true)}
              {renderAnalysisDetail('Actionable Recommendations', analysis.actionable_recommendations, true)}
              
              <View className={`p-4 border-t border-border ${analysis.vet_flag ? 'bg-error/10' : 'bg-success/10'}`}>
                <Text className="font-bold mb-1 text-text_primary">{analysis.vet_flag ? 'Vet Recommendation' : 'Vet Check'}</Text>
                <Text className={`font-bold mb-2 ${analysis.vet_flag ? 'text-error' : 'text-success'}`}>
                  {analysis.vet_flag ? '⚠️ Consult a vet' : '✅ All Clear'}
                </Text>
                <Text className="text-xs text-text_secondary leading-4">
                  {analysis.vet_flag 
                    ? "The AI detected potential abnormalities. We recommend showing this log to your vet."
                    : "Visual analysis suggests a healthy stool. Continue monitoring for any changes."}
                </Text>
              </View>
            </View>

            {/* Manual Details Section for AI Logs */}
            <View className="mb-6">
              <TouchableOpacity 
                className="bg-surface border border-border p-4 rounded-2xl items-center mb-4"
                onPress={() => setIsEditModalVisible(true)}
              >
                <Text className="text-text_primary font-semibold text-base">
                  {hasManualDetails ? "Edit Manual Observations" : "Add Manual Observations"}
                </Text>
              </TouchableOpacity>

              {hasManualDetails && (
                <View className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm animate-fade-in">
                  <View className="p-4 border-b border-border bg-surface_variant">
                    <Text className="text-lg font-bold text-text_primary">Manual Observations</Text>
                  </View>
                  {renderAnalysisDetail('Consistency Score', `${log.consistency_score}/5`)}
                  {renderAnalysisDetail('Color', log.color.replace(/_/g, ' '))}
                  {renderAnalysisDetail('Mucus Present', log.mucus_present ? 'Yes' : 'No')}
                  {renderAnalysisDetail('Blood Visible', log.blood_visible ? 'Yes' : 'No')}
                  {renderAnalysisDetail('Worms Visible', log.worms_visible ? 'Yes' : 'No')}
                  {log.notes && renderAnalysisDetail('Notes', log.notes)}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View className="mb-6">
            <View className="p-6 bg-surface rounded-3xl border border-border items-center mb-6">
              <Ionicons name="analytics-outline" size={48} color={Colors.text_muted} />
              <Text className="text-text_muted mt-2 text-center">No AI Analysis available for this log.</Text>
              <Text className="text-xs text-text_muted mt-1">Log ID: {logId}</Text>
            </View>

            <View className="mb-6">
              <TouchableOpacity 
                className="flex-row justify-between items-center mb-3"
                onPress={() => {
                  Haptics.selectionAsync();
                  setIsManualDetailsExpanded(!isManualDetailsExpanded);
                }}
              >
                <Text className="text-lg font-bold text-text_primary">Manual Details</Text>
                <Ionicons name={isManualDetailsExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.text_secondary} />
              </TouchableOpacity>
              
              {isManualDetailsExpanded && (
                <View className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm animate-fade-in">
                  {renderAnalysisDetail('Consistency Score', `${log.consistency_score}/5`)}
                  {renderAnalysisDetail('Color', log.color.replace(/_/g, ' '))}
                  {renderAnalysisDetail('Mucus Present', log.mucus_present ? 'Yes' : 'No')}
                  {renderAnalysisDetail('Blood Visible', log.blood_visible ? 'Yes' : 'No')}
                  {renderAnalysisDetail('Worms Visible', log.worms_visible ? 'Yes' : 'No')}
                  {log.notes && renderAnalysisDetail('Notes', log.notes)}
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Oh Crap CTA */}
        {analysis && (
          <View className="mb-6 p-6 bg-primary_light rounded-3xl items-center border border-primary shadow-sm">
              <Image 
                source={require('../../../assets/images/logo.png')} 
                className="w-16 h-16 rounded-2xl mb-4"
                resizeMode="contain"
              />
              <Text className="text-xl font-bold text-primary_dark text-center mb-2">Analysis Complete!</Text>
              <Text className="text-center text-primary_dark mb-4">Keep your walks clean and sustainable with Oh Crap bags.</Text>
              <TouchableOpacity 
                  className="bg-primary p-4 rounded-2xl w-full shadow-lg shadow-primary/30"
                  onPress={handleShopifyLink}
              >
                  <Text className="text-text_on_primary text-center font-bold text-lg">Shop Now - 10% Off</Text>
                  <Text className="text-green-100 text-center font-semibold text-sm mt-1">Use code: {Config.shop.discountCode}</Text>
              </TouchableOpacity>
          </View>
        )}

        {analysis && (
          <Text className="text-xs text-text_muted text-center px-4 mb-8">
            Disclaimer: The AI analysis is for informational purposes only and is not a substitute for professional veterinary advice. Always consult your vet for health concerns.
          </Text>
        )}

        {/* Export button moved to header */}

        <TouchableOpacity
          className="bg-surface border border-error p-4 rounded-2xl items-center justify-center mb-12"
          onPress={deleteLog}
        >
          <Text className="text-error text-lg font-bold">Delete Log</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View className="flex-1 bg-background">
          <View className="px-4 py-4 flex-row justify-between items-center border-b border-border">
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <Text className="text-primary text-lg">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-text_primary">Edit Details</Text>
            <TouchableOpacity onPress={handleSaveManualDetails}>
              <Text className="text-primary font-bold text-lg">Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView className="flex-1 p-6">
            {/* Consistency Section */}
            <View className="mb-8 bg-surface p-6 rounded-3xl border border-border shadow-sm">
              <Text className="text-xl font-bold mb-6 text-text_primary">Consistency</Text>
              <View className="items-center">
                <Slider
                  value={editConsistency}
                  onValueChange={setEditConsistency}
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.border}
                  thumbTintColor={Colors.primary}
                  style={{ width: '100%', height: 40 }}
                />
                <View className="flex-row justify-between w-full px-2 mt-2">
                  {Object.entries(consistencyLabels).map(([key, label]) => (
                    <Text key={key} className={`text-xs font-medium text-center w-16 ${parseInt(key) === editConsistency ? 'text-primary font-bold' : 'text-text_secondary'}`}>
                      {label}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            {/* Color Section */}
            <View className="mb-8">
              <Text className="text-xl font-bold mb-4 text-text_primary ml-1">Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                {colorOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    className={`p-4 rounded-[24px] mr-4 items-center justify-center h-36 w-32 ${editColor === option.value ? 'bg-primary_light border-2 border-primary' : 'bg-surface border border-border'}`}
                    onPress={() => setEditColor(option.value)}
                  >
                    <View 
                      style={{ backgroundColor: getColorHex(option.value) }} 
                      className="w-16 h-16 rounded-full mb-4 border border-gray-200 shadow-sm"
                    />
                    <Text className={`text-center text-sm font-semibold ${editColor === option.value ? 'text-primary_dark' : 'text-text_primary'}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {editColor === 'other' && (
                <View className="px-1 mt-4">
                  <Text className="text-base font-semibold text-text_primary mb-2">Describe Color</Text>
                  <TextInput
                    value={editOtherColor}
                    onChangeText={setEditOtherColor}
                    placeholder="e.g. Dark Green with spots..."
                    placeholderTextColor={Colors.text_muted}
                    className="border border-border bg-surface rounded-2xl p-4 text-text_primary text-base"
                  />
                </View>
              )}
            </View>

            {/* Symptoms Section */}
            <View className="mb-8 bg-surface rounded-3xl border border-border shadow-sm overflow-hidden">
              <View className="p-6 border-b border-border/50">
                <Text className="text-xl font-bold text-text_primary">Additional Symptoms</Text>
              </View>
              <View className="p-2">
                <View className="flex-row justify-between items-center py-4 px-4 border-b border-border/30">
                  <Text className="text-text_primary text-lg font-medium">Mucus</Text>
                  <Switch
                    value={editMucus}
                    onValueChange={setEditMucus}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={'#fff'}
                    ios_backgroundColor={Colors.border}
                    style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                  />
                </View>
                <View className="flex-row justify-between items-center py-4 px-4 border-b border-border/30">
                  <Text className="text-text_primary text-lg font-medium">Blood</Text>
                  <Switch
                    value={editBlood}
                    onValueChange={setEditBlood}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={'#fff'}
                    ios_backgroundColor={Colors.border}
                    style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                  />
                </View>
                <View className="flex-row justify-between items-center py-4 px-4">
                  <Text className="text-text_primary text-lg font-medium">Worms</Text>
                  <Switch
                    value={editWorms}
                    onValueChange={setEditWorms}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={'#fff'}
                    ios_backgroundColor={Colors.border}
                    style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                  />
                </View>
              </View>
            </View>

            {/* Notes Section */}
            <View className="mb-8">
              <Text className="text-xl font-bold mb-4 text-text_primary ml-1">Notes</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                className="border border-border bg-surface rounded-3xl p-6 text-text_primary h-40 text-lg leading-6"
                placeholder="Any additional notes about their diet, behavior, etc..."
                placeholderTextColor={Colors.text_muted}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Clear Data Button */}
            <TouchableOpacity 
              onPress={handleClearManualDetails}
              className="mb-12 p-4 bg-error/5 rounded-2xl items-center border border-error/20"
            >
              <Text className="text-error font-bold text-lg">Clear Manual Data</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PooDetailScreen;