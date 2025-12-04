import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('dog-poo.db');

export const initDatabase = () => {
  // Temporary: Drop table to ensure schema update during dev
  // db.execSync('DROP TABLE IF EXISTS ai_analysis;'); 

  db.execSync(`
    CREATE TABLE IF NOT EXISTS dog_profile (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      breed TEXT,
      age REAL NOT NULL,
      weight REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS poo_logs (
      id TEXT PRIMARY KEY NOT NULL,
      consistency_score INTEGER NOT NULL,
      color TEXT NOT NULL,
      mucus_present INTEGER NOT NULL,
      blood_visible INTEGER NOT NULL,
      worms_visible INTEGER NOT NULL,
      notes TEXT,
      photo_uri TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_analysis (
      id TEXT PRIMARY KEY NOT NULL,
      poo_log_id TEXT NOT NULL,
      classification TEXT,
      health_score REAL,
      gut_health_summary TEXT,
      shape_analysis TEXT,
      texture_analysis TEXT,
      color_analysis TEXT,
      moisture_analysis TEXT,
      parasite_check_results TEXT,
      flags_and_observations TEXT,
      actionable_recommendations TEXT,
      vet_flag INTEGER,
      confidence_score REAL,
      hydration_estimate TEXT,
      analysed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poo_log_id) REFERENCES poo_logs (id)
    );
  `);

  try {
    db.execSync('ALTER TABLE ai_analysis ADD COLUMN hydration_estimate TEXT;');
  } catch (e) {
    // Column likely already exists
  }
};
