import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, RefreshControl, ScrollView, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../../hooks/useProfile';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../lib/sqlite';
import { PooLog } from '../../types';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';

const HomeScreen = ({ navigation }) => {
  const { profile } = useProfile();
  const [logs, setLogs] = useState<PooLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = () => {
    try {
      // Join with ai_analysis to get health score if available
      const rows = db.getAllSync<PooLog & { health_score?: number }>(`
        SELECT pl.*, aa.health_score 
        FROM poo_logs pl 
        LEFT JOIN ai_analysis aa ON pl.id = aa.poo_log_id 
        ORDER BY pl.created_at DESC;
      `);
      setLogs(rows);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loadLogs();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const deleteLog = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Log",
      "Are you sure you want to delete this log?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            try {
              db.runSync('DELETE FROM poo_logs WHERE id = ?;', [id]);
              db.runSync('DELETE FROM ai_analysis WHERE poo_log_id = ?;', [id]);
              loadLogs();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.error(e);
              Alert.alert("Error", "Could not delete log.");
            }
          } 
        }
      ]
    );
  };

  const renderRightActions = (progress, dragX, id) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    
    return (
      <TouchableOpacity 
        className="bg-error justify-center items-center w-24 rounded-2xl mb-3 ml-2"
        onPress={() => deleteLog(id)}
      >
        <Ionicons name="trash-outline" size={24} color="white" />
        <Text className="text-white font-bold text-xs mt-1">Delete</Text>
      </TouchableOpacity>
    );
  };

  const generateReport = async () => {
    if (logs.length === 0) {
      Alert.alert('No Data', 'No logs available to export.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Get last 30 logs with full details
    const reportLogs = db.getAllSync<PooLog & { health_score?: number, classification?: string }>(`
        SELECT pl.*, aa.health_score, aa.classification 
        FROM poo_logs pl 
        LEFT JOIN ai_analysis aa ON pl.id = aa.poo_log_id 
        ORDER BY pl.created_at DESC 
        LIMIT 30;
    `);

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #2E7D32; text-align: center; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 16px; color: #666; margin-top: 0; }
            .meta { text-align: center; color: #666; margin-bottom: 30px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; vertical-align: middle; }
            th { background-color: #f2f2f2; color: #2E7D32; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .score-high { color: #388E3C; font-weight: bold; }
            .score-med { color: #FBC02D; font-weight: bold; }
            .score-low { color: #D32F2F; font-weight: bold; }
            img { width: 150px; height: 150px; object-fit: cover; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Health Report: ${profile?.name || 'Dog'}</h1>
          <h2>Oh Crap Dog Poo Tracker</h2>
          <div class="meta">
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Showing last ${reportLogs.length} logs</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 15%">Date/Time</th>
                <th style="width: 20%">Photo</th>
                <th style="width: 10%">Health Score</th>
                <th style="width: 25%">Classification</th>
                <th style="width: 30%">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${reportLogs.map(log => `
                <tr>
                  <td>
                    <strong>${new Date(log.created_at).toLocaleDateString()}</strong><br/>
                    ${new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td>
                    ${log.photo_uri ? `<img src="${log.photo_uri}" />` : '<span style="color:#ccc; font-style:italic;">No Photo</span>'}
                  </td>
                  <td class="${(log.health_score || 0) > 80 ? 'score-high' : (log.health_score || 0) > 50 ? 'score-med' : 'score-low'}">
                    ${log.health_score ? log.health_score + '/100' : 'Manual'}
                  </td>
                  <td>${log.classification || 'Manual Log'}</td>
                  <td>
                    ${!log.classification ? `
                      <strong>Consistency:</strong> ${log.consistency_score}/5<br/>
                      <strong>Color:</strong> ${log.color.replace(/_/g, ' ')}<br/>
                    ` : ''}
                    ${log.notes ? `<em>"${log.notes}"</em>` : (log.classification ? '-' : '')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #999;">
            <p>Disclaimer: This report is for informational purposes only and does not constitute a medical diagnosis.</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Could not generate PDF report.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="px-6 pt-2 pb-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-lg text-text_secondary font-medium">{getGreeting()},</Text>
            <Text className="text-3xl font-bold text-text_primary">How's {profile?.name || 'your pup'}?</Text>
          </View>
          {/* Settings button moved to Tab Bar */}
        </View>
      </View>

      <View className="px-6 mb-6">
        <TouchableOpacity
          className="bg-primary p-6 rounded-3xl items-center justify-center shadow-lg shadow-primary/30"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            navigation.navigate('LogPoo');
          }}
        >
          <View className="bg-white/20 p-3 rounded-full mb-2">
            <Ionicons name="add" size={32} color="white" />
          </View>
          <Text className="text-text_on_primary text-xl font-bold">Log a Poo</Text>
          <Text className="text-primary_light text-sm mt-1">Track health with AI</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 bg-surface rounded-t-[40px] px-6 pt-8 shadow-inner">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-text_primary">History ({logs.length})</Text>
          <TouchableOpacity onPress={generateReport} className="flex-row items-center bg-surface_highlight px-3 py-1 rounded-full">
            <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
            <Text className="text-primary font-semibold ml-1 text-sm">Export PDF</Text>
          </TouchableOpacity>
        </View>

        {logs.length > 0 ? (
          <FlatList
            data={logs}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            renderItem={({ item }) => (
              <Swipeable
                renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
                containerStyle={{ overflow: 'visible' }}
              >
                <TouchableOpacity
                  className="bg-background p-4 rounded-2xl mb-3 flex-row items-center border border-border shadow-sm"
                  onPress={() => navigation.navigate('PooDetail', { logId: item.id })}
                  delayLongPress={500}
                >
                  <View className="bg-surface_highlight p-2 rounded-xl mr-4">
                    {item.photo_uri ? (
                      <Image source={{ uri: item.photo_uri }} className="w-12 h-12 rounded-lg" />
                    ) : (
                      <View className="w-12 h-12 items-center justify-center">
                        <Text className="text-2xl">💩</Text>
                      </View>
                    )}
                  </View>
                  
                  <View className="flex-1">
                    <Text className="font-bold text-text_primary text-base">{formatDate(item.created_at)}</Text>
                    <Text className="text-text_secondary text-sm">
                      {formatTime(item.created_at)} • {item.health_score != null ? `Health: ${item.health_score}/100` : `Score: ${item.consistency_score}/5`}
                    </Text>
                  </View>
                  
                  <View className="bg-surface p-2 rounded-full border border-border">
                    <Ionicons name="chevron-forward" size={20} color={Colors.text_muted} />
                  </View>
                </TouchableOpacity>
              </Swipeable>
            )}
          />
        ) : (
          <ScrollView 
            contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
          >
            <View className="bg-background p-6 rounded-full mb-4">
              <Ionicons name="paw-outline" size={48} color={Colors.text_muted} />
            </View>
            <Text className="text-text_primary font-bold text-lg mb-1">No logs yet</Text>
            <Text className="text-text_secondary text-center">Tap the big green button above{'\n'}to start tracking!</Text>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
