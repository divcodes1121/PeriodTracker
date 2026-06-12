export const COLORS = {
  primary: '#FF6B9D',
  primaryLight: '#FFB3D9',
  primaryDark: '#E63973',
  
  secondary: '#C44569',
  accent: '#FFA500',
  accentLight: '#FFD700',
  
  menstrual: '#E63973',
  follicular: '#A1DE93',
  ovulation: '#FFB84D',
  luteal: '#9B59B6',
  
  background: '#FAFAFA',
  backgroundDark: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceDark: '#F8F8F8',
  
  text: '#1A1A1A',
  textSecondary: '#757575',
  textTertiary: '#9E9E9E',
  
  error: '#E63973',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
  
  divider: '#EEEEEE',
  border: '#E0E0E0',
  
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

export const GRADIENT = {
  primary: [COLORS.primaryLight, COLORS.primary],
  fertility: [COLORS.primaryLight, COLORS.accent],
  wellness: ['#A1DE93', '#4CAF50'],
  sunset: [COLORS.accentLight, COLORS.accent],
  calm: ['#B5E7A0', '#7CB342'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const CYCLE_PHASES = {
  menstrual: {
    name: 'Menstrual',
    days: { start: 1, end: 5 },
    color: COLORS.menstrual,
    description: 'Your period - a time for rest and self-care',
    symptoms: ['Cramps', 'Fatigue', 'Mood changes'],
    recommendations: ['Rest', 'Warm compress', 'Light exercise'],
  },
  follicular: {
    name: 'Follicular',
    days: { start: 6, end: 14 },
    color: COLORS.follicular,
    description: 'Rising energy - great time for new projects',
    symptoms: ['Energy boost', 'Confidence', 'Creativity'],
    recommendations: ['Start new projects', 'Exercise', 'Social time'],
  },
  ovulation: {
    name: 'Ovulation',
    days: { start: 15, end: 17 },
    color: COLORS.ovulation,
    description: 'Peak fertility - enhanced mood and confidence',
    symptoms: ['High energy', 'Increased libido', 'Confidence'],
    recommendations: ['Plan important meetings', 'Social activities'],
  },
  luteal: {
    name: 'Luteal',
    days: { start: 18, end: 28 },
    color: COLORS.luteal,
    description: 'Inward phase - time for reflection',
    symptoms: ['Fatigue', 'Mood shifts', 'Cravings'],
    recommendations: ['Self-care', 'Journaling', 'Gentle exercise'],
  },
};

export const SYMPTOMS = {
  cramps: { label: 'Cramps', emoji: '🤕' },
  headache: { label: 'Headache', emoji: '🤕' },
  fatigue: { label: 'Fatigue', emoji: '😴' },
  bloating: { label: 'Bloating', emoji: '💨' },
  acne: { label: 'Acne', emoji: '🔴' },
  nausea: { label: 'Nausea', emoji: '🤢' },
  backpain: { label: 'Back Pain', emoji: '🔙' },
  anxiety: { label: 'Anxiety', emoji: '😰' },
  mood_swings: { label: 'Mood Swings', emoji: '🎭' },
  cravings: { label: 'Cravings', emoji: '🍫' },
};

export const FLOW_INTENSITY = {
  light: { label: 'Light', emoji: '🟢' },
  medium: { label: 'Medium', emoji: '🟡' },
  heavy: { label: 'Heavy', emoji: '🔴' },
};

export const ONBOARDING_STEPS = [
  'Welcome',
  'Health Info',
  'Cycle Details',
  'Preferences',
  'Privacy',
  'Ready!',
];

export const NOTIFICATION_TYPES = {
  periodReminder: 'Period Starting Soon',
  ovulationReminder: 'Ovulation Window',
  healthTip: 'Wellness Tip',
  symptomCheck: 'Daily Check-in',
  aiInsight: 'Personalized Insight',
};
