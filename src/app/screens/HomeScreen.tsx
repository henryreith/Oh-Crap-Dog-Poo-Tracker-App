import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../../hooks/useProfile';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../lib/sqlite';
import { PooLog } from '../../types';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }) => {
  const { profile } = useProfile();
  const [logs, setLogs] = useState<PooLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = () => {
    try {
      const rows = db.getAllSync<PooLog>('SELECT * FROM poo_logs ORDER BY created_at DESC LIMIT 10;');
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-2 pb-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-lg text-text_secondary font-medium">{getGreeting()},</Text>
            <Text className="text-3xl font-bold text-text_primary">{profile?.name || 'Friend'}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Settings');
            }}
            className="bg-surface p-3 rounded-full shadow-sm border border-border"
          >
            <Ionicons name="settings-outline" size={24} color={Colors.text_primary} />
          </TouchableOpacity>
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
          <Text className="text-xl font-bold text-text_primary">Recent Activity</Text>
          <TouchableOpacity>
            <Text className="text-primary font-semibold">See All</Text>
          </TouchableOpacity>
        </View>

        {logs.length > 0 ? (
          <FlatList
            data={logs}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                className="bg-background p-4 rounded-2xl mb-3 flex-row items-center border border-border shadow-sm"
                onPress={() => navigation.navigate('PooDetail', { logId: item.id })}
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
                  <Text className="text-text_secondary text-sm">{formatTime(item.created_at)} • Score: {item.consistency_score}/5</Text>
                </View>
                
                <View className="bg-surface p-2 rounded-full border border-border">
                  <Ionicons name="chevron-forward" size={20} color={Colors.text_muted} />
                </View>
              </TouchableOpacity>
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
