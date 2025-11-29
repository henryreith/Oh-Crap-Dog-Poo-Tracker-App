export type DogProfile = {
  id: number;
  name: string;
  breed?: string;
  age: number;
  weight: number;
};

export type PooLog = {
  id: string;
  consistency_score: number;
  color: 'normal_brown' | 'greenish' | 'yellow_orange' | 'greasy_gray' | 'black_tarry' | 'red_streaks';
  mucus_present: boolean;
  blood_visible: boolean;
  worms_visible: boolean;
  notes?: string;
  photo_uri?: string;
  created_at: string;
  ai_analysis?: AIAnalysis;
};

export type AIAnalysis = {
  id: string;
  poo_log_id: string;
  classification?: string;
  health_score?: number;
  gut_health_summary?: string;
  shape_analysis?: string;
  texture_analysis?: string;
  color_analysis?: string;
  moisture_analysis?: string;
  parasite_check_results?: string;
  flags_and_observations?: string;
  actionable_recommendations?: string;
  vet_flag?: boolean;
  confidence_score?: number;
  analysed_at: string;
};
