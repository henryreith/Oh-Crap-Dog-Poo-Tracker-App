import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../../../hooks/useProfile';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../../lib/sqlite';
import { PooLog } from '../../../types';
import * as Haptics from 'expo-haptics';

const HomeScreen = ({ navigation }) => {
  const { profile } = useProfile();
  const [logs, setLogs] = useState<PooLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM poo_logs ORDER BY created_at DESC LIMIT 10;',
        [],
        (_, { rows }) => {
          setLogs(rows._array);
        },
        (_, error) => {
          console.error('Error loading logs:', error);
          return false;
        }
      );
    });
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-4">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-xl text-text_secondary">{getGreeting()},</Text>
            <Text className="text-3xl font-bold text-text_primary">{profile?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('Settings');
          }}>
            {/* Settings Icon can go here */}
            <Text className="text-primary">Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="p-4">
        <TouchableOpacity
          className="bg-primary p-5 rounded-lg items-center justify-center shadow"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            navigation.navigate('LogPoo');
          }}
        >
          <Text className="text-text_on_primary text-2xl font-bold">Log a Poo 💩</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 p-4">
        <Text className="text-xl font-bold mb-2 text-text_primary">Recent Logs</Text>
        {logs.length > 0 ? (
          <FlatList
            data={logs}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                className="bg-surface p-4 rounded-lg mb-2 flex-row items-center border border-border"
                onPress={() => navigation.navigate('PooDetail', { logId: item.id })}
              >
                {item.photo_uri && (
                  <Image source={{ uri: item.photo_uri }} className="w-16 h-16 rounded-md mr-4" />
                )}
                <View>
                  <Text className="font-bold text-text_primary">{new Date(item.created_at).toLocaleString()}</Text>
                  <Text className="text-text_secondary">Consistency: {item.consistency_score}/7</Text>
                  <Text className="text-text_secondary">Color: {item.color.replace('_', ' ')}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <ScrollView 
            contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <Text className="text-text_muted">No poos logged yet.</Text>
            <Text className="text-text_muted">Tap the button above to get started!</Text>
          </ScrollView>
        )}
      </View>
      <Text className="text-center text-text_muted p-2">Made with ❤️ by Oh Crap</Text>
    </SafeAreaView>
  );
};

export default HomeScreen;
