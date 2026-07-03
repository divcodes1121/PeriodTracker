export interface User {
  id: string;
  email: string;
  name: string;
  dateOfBirth: Date;
  cycleLength: number;
  periodLength: number;
  averageCycleLength: number;
  lastPeriodStart: Date;
  createdAt: Date;
  updatedAt: Date;
  privacySettings: PrivacySettings;
  preferences: UserPreferences;
}

export interface PrivacySettings {
  biometricLock: boolean;
  pinLock: string | null;
  allowPartnerMode: boolean;
  dataEncrypted: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  aiInsights: boolean;
  language: string;
}

export interface PeriodEntry {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date | null;
  flowIntensity: 'light' | 'medium' | 'heavy';
  symptoms: Symptom[];
  mood: MoodEntry | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Symptom {
  id: string;
  type: SymptomType;
  severity: number; // 1-5
  timestamp: Date;
}

export type SymptomType =
  | 'cramps'
  | 'headache'
  | 'fatigue'
  | 'bloating'
  | 'acne'
  | 'nausea'
  | 'backpain'
  | 'anxiety'
  | 'mood_swings'
  | 'cravings';

/**
 * A day's symptom log, tracked independently of periods. Keeping this
 * separate from PeriodEntry ensures logging symptoms on a non-period day
 * never gets mistaken for the start of a new period in cycle calculations.
 */
export interface SymptomLog {
  id: string;
  userId: string;
  date: Date;
  symptoms: Symptom[];
  flowIntensity: 'none' | 'light' | 'medium' | 'heavy';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MoodEntry {
  id: string;
  userId: string;
  timestamp: Date;
  mood: number; // 1-5
  stress: number; // 1-5
  energy: number; // 1-5
  sleep: number; // hours
  waterIntake: number; // cups
  exercise: string | null;
  notes: string;
  createdAt: Date;
}

export interface CyclePhase {
  name: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
  startDay: number;
  endDay: number;
  description: string;
  color: string;
  expectedSymptoms: string[];
  wellnessScore: number;
}

export interface HealthMetric {
  id: string;
  userId: string;
  date: Date;
  weight?: number;
  waterIntake?: number;
  exerciseMinutes?: number;
  sleepHours?: number;
  medicationTaken?: string[];
  sexualActivity?: boolean;
  birthControlType?: string;
}

export interface AIInsight {
  id: string;
  userId: string;
  timestamp: Date;
  title: string;
  description: string;
  type: 'prediction' | 'trend' | 'recommendation' | 'warning';
  confidence: number;
  relatedMetrics: string[];
}

export interface PartnerAccess {
  id: string;
  userId: string;
  partnerId: string;
  partnerName: string;
  permissions: PartnerPermission[];
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
}

export type PartnerPermission =
  | 'view_period_status'
  | 'view_fertility_window'
  | 'view_mood_phase'
  | 'view_health_metrics';

export interface CalendarEvent {
  date: Date;
  type: 'period' | 'ovulation' | 'fertility' | 'predicted_period';
  label: string;
  color: string;
}

export interface CycleStats {
  averageCycleLength: number;
  cycleVariability: number;
  periodLength: number;
  ovulationDay: number;
  fertilityWindowStart: number;
  fertilityWindowEnd: number;
  predictedNextPeriod: Date;
  lastSixCycles: number[];
  irregularityDetected: boolean;
}
