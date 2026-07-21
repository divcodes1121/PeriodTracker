import { mergeSymptoms } from '../utils/cycleCalculations';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  PeriodEntry,
  MoodEntry,
  HealthMetric,
  AIInsight,
  PartnerAccess,
  SymptomLog,
  ResetSession,
} from '../types';

const isSameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

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

  // Symptom Logs (daily, independent of periods)
  symptomLogs: SymptomLog[];
  setSymptomLogs: (logs: SymptomLog[]) => void;
  // Merges into the same calendar day's log if one exists, else creates it.
  upsertSymptomLog: (log: SymptomLog) => void;
  deleteSymptomLog: (id: string) => void;

  // Tiny Escapes sessions (with post-session check-outs)
  resetSessions: ResetSession[];
  addResetSession: (session: ResetSession) => void;

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

  // Hydration flag — true once persisted state has loaded from disk
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  // Clear all data
  clearStore: () => void;
}

/**
 * Matches ISO 8601 date strings so we can rehydrate them back into Date
 * objects. Without this, every Date field (lastPeriodStart, startDate, etc.)
 * would come back from storage as a plain string and break date math.
 */
const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

const dateReviver = (_key: string, value: unknown) =>
  typeof value === 'string' && ISO_DATE_RE.test(value) ? new Date(value) : value;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
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
          periodEntries: state.periodEntries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
      deletePeriodEntry: (id) =>
        set((state) => ({
          periodEntries: state.periodEntries.filter((e) => e.id !== id),
        })),

      // Symptom Logs defaults
      symptomLogs: [],
      setSymptomLogs: (symptomLogs) => set({ symptomLogs }),
      upsertSymptomLog: (log) =>
        set((state) => {
          const existing = state.symptomLogs.find((l) =>
            isSameCalendarDay(l.date, log.date)
          );
          if (existing) {
            return {
              symptomLogs: state.symptomLogs.map((l) =>
                l.id === existing.id
                  ? {
                      ...l,
                      // Merge by type — see mergeSymptoms. Concatenating meant
                      // re-logging a day double-counted every symptom, which
                      // silently inflated the frequency stats built on top.
                      symptoms: mergeSymptoms(l.symptoms, log.symptoms),
                      flowIntensity: log.flowIntensity,
                      notes: log.notes || l.notes,
                      updatedAt: new Date(),
                    }
                  : l
              ),
            };
          }
          return { symptomLogs: [...state.symptomLogs, log] };
        }),
      deleteSymptomLog: (id) =>
        set((state) => ({
          symptomLogs: state.symptomLogs.filter((l) => l.id !== id),
        })),

      // Tiny Escapes defaults
      resetSessions: [],
      addResetSession: (session) =>
        set((state) => ({ resetSessions: [...state.resetSessions, session] })),

      // Mood Entries defaults
      moodEntries: [],
      setMoodEntries: (moodEntries) => set({ moodEntries }),
      addMoodEntry: (entry) =>
        set((state) => ({ moodEntries: [...state.moodEntries, entry] })),
      updateMoodEntry: (id, updates) =>
        set((state) => ({
          moodEntries: state.moodEntries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
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
      addAIInsight: (insight) =>
        set((state) => ({ aiInsights: [...state.aiInsights, insight] })),

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

      // Hydration
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      // Clear store
      clearStore: () =>
        set({
          user: null,
          isAuthenticated: false,
          showOnboarding: true,
          periodEntries: [],
          symptomLogs: [],
          resetSessions: [],
          moodEntries: [],
          healthMetrics: [],
          aiInsights: [],
          partnerAccess: [],
          selectedDate: null,
        }),
    }),
    {
      name: 'period-tracker-store',
      storage: createJSONStorage(() => AsyncStorage, { reviver: dateReviver }),
      // Only persist data + user-facing settings. Transient UI flags
      // (isLoading, selectedDate, hasHydrated) are intentionally excluded.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        periodEntries: state.periodEntries,
        symptomLogs: state.symptomLogs,
        resetSessions: state.resetSessions,
        moodEntries: state.moodEntries,
        healthMetrics: state.healthMetrics,
        aiInsights: state.aiInsights,
        partnerAccess: state.partnerAccess,
        theme: state.theme,
        showOnboarding: state.showOnboarding,
        enableNotifications: state.enableNotifications,
        enableAIInsights: state.enableAIInsights,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
