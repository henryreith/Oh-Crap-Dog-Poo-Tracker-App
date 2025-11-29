import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, initDatabase } from '../lib/sqlite';
import { DogProfile } from '../types';

export const ProfileContext = createContext<{
  profile: DogProfile | null;
  loading: boolean;
  createProfile: (profile: Omit<DogProfile, 'id'>) => Promise<void>;
  updateProfile: (profile: DogProfile) => Promise<void>;
}>({
  profile: null,
  loading: true,
  createProfile: async () => {},
  updateProfile: async () => {},
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
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM dog_profile LIMIT 1;',
        [],
        (_, { rows }) => {
          if (rows.length > 0) {
            setProfile(rows._array[0]);
          }
          setLoading(false);
        },
        (_, error) => {
          console.error('Error loading profile:', error);
          setLoading(false);
          return false;
        }
      );
    });
  };

  const createProfile = async (newProfile: Omit<DogProfile, 'id'>) => {
    return new Promise<void>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO dog_profile (name, breed, age, weight) VALUES (?, ?, ?, ?);',
          [newProfile.name, newProfile.breed, newProfile.age, newProfile.weight],
          (_, { insertId }) => {
            setProfile({ id: insertId, ...newProfile });
            resolve();
          },
          (_, error) => {
            console.error('Error creating profile:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  };

  const updateProfile = async (updatedProfile: DogProfile) => {
     return new Promise<void>((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                'UPDATE dog_profile SET name = ?, breed = ?, age = ?, weight = ? WHERE id = ?;',
                [updatedProfile.name, updatedProfile.breed, updatedProfile.age, updatedProfile.weight, updatedProfile.id],
                () => {
                    setProfile(updatedProfile);
                    resolve();
                },
                (_, error) => {
                    console.error('Error updating profile:', error);
                    reject(error);
                    return false;
                }
            );
        });
    });
  };

  return (
    <ProfileContext.Provider value={{ profile, loading, createProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};
