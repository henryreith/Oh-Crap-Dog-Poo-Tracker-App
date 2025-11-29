import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, initDatabase } from '../lib/sqlite';
import { DogProfile } from '../types';

export const ProfileContext = createContext<{
  profile: DogProfile | null;
  loading: boolean;
  createProfile: (profile: Omit<DogProfile, 'id'>) => Promise<void>;
  updateProfile: (profile: DogProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
}>({
  profile: null,
  loading: true,
  createProfile: async () => {},
  updateProfile: async () => {},
  clearProfile: async () => {},
});

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<DogProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDatabase();
    loadProfile();
  }, []);

  const loadProfile = () => {
    try {
      const result = db.getFirstSync<DogProfile>('SELECT * FROM dog_profile LIMIT 1;');
      if (result) {
        setProfile(result);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  };

  const createProfile = async (newProfile: Omit<DogProfile, 'id'>) => {
    try {
      const result = db.runSync(
        'INSERT INTO dog_profile (name, breed, age, weight) VALUES (?, ?, ?, ?);',
        [newProfile.name, newProfile.breed, newProfile.age, newProfile.weight]
      );
      setProfile({ id: result.lastInsertRowId, ...newProfile });
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  };

  const updateProfile = async (updatedProfile: DogProfile) => {
    try {
      db.runSync(
        'UPDATE dog_profile SET name = ?, breed = ?, age = ?, weight = ? WHERE id = ?;',
        [updatedProfile.name, updatedProfile.breed, updatedProfile.age, updatedProfile.weight, updatedProfile.id]
      );
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const clearProfile = async () => {
    try {
      db.runSync('DELETE FROM dog_profile;');
      setProfile(null);
    } catch (error) {
      console.error('Error clearing profile:', error);
      throw error;
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, loading, createProfile, updateProfile, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};
