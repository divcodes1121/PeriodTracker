import { create } from 'zustand';
import {
  User,
  PeriodEntry,
  MoodEntry,
  HealthMetric,
  AIInsight,
  PartnerAccess,
} from '../types';

interface AppStore {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;

  // Period Entries
  periodEntries: PeriodEntry[];
  setPeriodEntries: (entries: PeriodEntry[]) => void;
  addPeriodEntry: (entry: PeriodEntry) => void;
  updatePeriodEntry: (id: string, updates: Partial<PeriodEntry>) => void;
  deletePeriodEntry: (id: string) => void;

  // Mood Entries
  moodEntries: MoodEntry[];
  setMoodEntries: (entries: MoodEntry[]) => void;
  addMoodEntry: (entry: MoodEntry) => void;
  updateMoodEntry: (id: string, updates: Partial<MoodEntry>) => void;

  // Health Metrics
  healthMetrics: HealthMetric[];
  setHealthMetrics: (metrics: HealthMetric[]) => void;
  addHealthMetric: (metric: HealthMetric) => void;
  updateHealthMetric: (id: string, updates: Partial<HealthMetric>) => void;

  // AI Insights
  aiInsights: AIInsight[];
  setAIInsights: (insights: AIInsight[]) => void;
  addAIInsight: (insight: AIInsight) => void;

  // Partner Access
  partnerAccess: PartnerAccess[];
  setPartnerAccess: (access: PartnerAccess[]) => void;
  addPartnerAccess: (access: PartnerAccess) => void;
  revokePartnerAccess: (id: string) => void;

  // UI State
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  showOnboarding: boolean;
  setShowOnboarding: (value: boolean) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;

  // Preferences
  enableNotifications: boolean;
  setEnableNotifications: (value: boolean) => void;
  enableAIInsights: boolean;
  setEnableAIInsights: (value: boolean) => void;

  // Clear all data
  clearStore: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Auth defaults
  user: null,
  isAuthenticated: false,
  isLoading: false,
  setUser: (user) => set({ user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),

  // Period Entries defaults
  periodEntries: [],
  setPeriodEntries: (periodEntries) => set({ periodEntries }),
  addPeriodEntry: (entry) =>
    set((state) => ({ periodEntries: [...state.periodEntries, entry] })),
  updatePeriodEntry: (id, updates) =>
    set((state) => ({
      periodEntries: state.periodEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  deletePeriodEntry: (id) =>
    set((state) => ({
      periodEntries: state.periodEntries.filter((e) => e.id !== id),
    })),

  // Mood Entries defaults
  moodEntries: [],
  setMoodEntries: (moodEntries) => set({ moodEntries }),
  addMoodEntry: (entry) => set((state) => ({ moodEntries: [...state.moodEntries, entry] })),
  updateMoodEntry: (id, updates) =>
    set((state) => ({
      moodEntries: state.moodEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  // Health Metrics defaults
  healthMetrics: [],
  setHealthMetrics: (healthMetrics) => set({ healthMetrics }),
  addHealthMetric: (metric) =>
    set((state) => ({ healthMetrics: [...state.healthMetrics, metric] })),
  updateHealthMetric: (id, updates) =>
    set((state) => ({
      healthMetrics: state.healthMetrics.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  // AI Insights defaults
  aiInsights: [],
  setAIInsights: (aiInsights) => set({ aiInsights }),
  addAIInsight: (insight) => set((state) => ({ aiInsights: [...state.aiInsights, insight] })),

  // Partner Access defaults
  partnerAccess: [],
  setPartnerAccess: (partnerAccess) => set({ partnerAccess }),
  addPartnerAccess: (access) =>
    set((state) => ({ partnerAccess: [...state.partnerAccess, access] })),
  revokePartnerAccess: (id) =>
    set((state) => ({
      partnerAccess: state.partnerAccess.filter((p) => p.id !== id),
    })),

  // UI defaults
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  showOnboarding: true,
  setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
  selectedDate: null,
  setSelectedDate: (selectedDate) => set({ selectedDate }),

  // Preferences defaults
  enableNotifications: true,
  setEnableNotifications: (enableNotifications) => set({ enableNotifications }),
  enableAIInsights: true,
  setEnableAIInsights: (enableAIInsights) => set({ enableAIInsights }),

  // Clear store
  clearStore: () =>
    set({
      user: null,
      isAuthenticated: false,
      periodEntries: [],
      moodEntries: [],
      healthMetrics: [],
      aiInsights: [],
      partnerAccess: [],
      selectedDate: null,
    }),
}));
