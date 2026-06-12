# 🌸 Period Tracker - AI-Powered Menstrual Health Companion

A beautiful, feature-rich period tracking app built with React Native, Expo, and designed for both iOS and Android. This app combines cycle tracking, wellness insights, mood prediction, and AI-powered personalization with stunning animations and micro-interactions.

## ✨ Features

### Core Tracking
- **📅 Period Tracking**: Log period dates, duration, and flow intensity
- **🔄 Cycle Predictions**: AI-powered predictions for next period and fertility windows
- **💚 Fertility Window**: Accurate ovulation and fertility window calculations
- **📊 Symptom Logging**: Track 10+ symptoms with severity levels
- **🎭 Mood Tracking**: Daily mood, stress, energy, sleep, and hydration tracking

### Health & Wellness
- **📈 Analytics**: Visual trends for mood, cycle patterns, and health metrics
- **✨ AI Insights**: Personalized health insights based on your data
- **💡 Phase Recommendations**: Phase-specific wellness recommendations
- **🧬 Wellness Score**: Daily wellness assessment

### Premium Interactions
- **🎨 Beautiful UI**: Glassmorphism design, smooth gradients, and animations
- **⚡ Micro-interactions**: Delightful button feedback, card animations, and transitions
- **🎯 Smooth Navigation**: Tab-based navigation with beautiful transitions
- **🔔 Smart Notifications**: Period, ovulation, and wellness reminders

### Privacy & Security
- **🔐 End-to-End Encrypted**: Your sensitive health data is encrypted
- **👁️ Biometric Lock**: Optional biometric authentication (coming soon)
- **📊 Data Export**: Export your complete health data
- **🔒 Privacy First**: GDPR-compliant data handling

## 🛠️ Tech Stack

- **React Native** with **Expo** - Cross-platform mobile development
- **TypeScript** - Type-safe development
- **React Navigation** - Seamless navigation
- **React Native Reanimated** - 60fps animations
- **Lottie** - Premium micro-animations
- **Zustand** - Lightweight state management
- **Firebase** (optional) - Backend & authentication
- **date-fns** - Date calculations and utilities

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode (for iOS development)
- Android: Android Studio (for Android development)

### Setup

```bash
# Navigate to project
cd PeriodTracker

# Install dependencies
npm install

# Start Expo
npm start
```

### Running on Different Platforms

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 📱 App Structure

```
src/
├── app/                    # Expo Router main entry
├── screens/                # Main app screens
│   ├── HomeScreen.tsx
│   ├── CalendarScreen.tsx
│   ├── MoodTrackerScreen.tsx
│   ├── SymptomLoggerScreen.tsx
│   ├── AnalyticsScreen.tsx
│   ├── AIInsightsScreen.tsx
│   ├── SettingsScreen.tsx
│   └── OnboardingScreen.tsx
├── components/             # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   └── AnimatedCard.tsx
├── store/                  # Zustand state management
│   └── appStore.ts
├── utils/                  # Utility functions
│   └── cycleCalculations.ts
├── services/               # API & Firebase services
├── types/                  # TypeScript interfaces
├── constants/              # App constants & theme
├── navigation/             # Navigation configuration
└── theme/                  # Theme configuration
```

## 🎯 Key Screens

### 🏠 Home Dashboard
- Current cycle phase with color-coded visualization
- Days until next period with progress bar
- Fertility window status
- Quick action buttons
- AI insights preview

### 📅 Calendar
- Month-by-month calendar view
- Color-coded cycle phases
- Day selection with details
- Phase recommendations
- Phase-specific wellness tips

### 🎭 Mood Tracker
- Daily mood (1-5 rating with emojis)
- Stress level tracking
- Energy level assessment
- Sleep hours logging
- Water intake tracking

### 📊 Symptom Logger
- 10+ symptoms to choose from
- Flow intensity selection (Light/Medium/Heavy)
- Severity rating for each symptom
- Notes section

### 📈 Analytics
- Cycle statistics (average length, variability)
- Mood trends over 7 days
- Period predictions
- Irregularity detection
- Wellness insights

### ✨ AI Insights
- Personalized health predictions
- Symptom trend analysis
- Mood pattern recognition
- Wellness recommendations
- Confidence scores

### ⚙️ Settings
- Profile management
- Notification preferences
- AI insights toggle
- Privacy & security settings
- Data export
- Account management

## 🎨 Design System

### Colors
- **Primary**: `#FF6B9D` (Blush Pink)
- **Menstrual**: `#E63973` (Deep Pink)
- **Follicular**: `#A1DE93` (Green)
- **Ovulation**: `#FFB84D` (Orange)
- **Luteal**: `#9B59B6` (Purple)

### Typography
- **H1**: 32px, Bold, Line height 40
- **H2**: 28px, Bold, Line height 36
- **Body1**: 16px, Regular, Line height 24
- **Button**: 14px, Semi-bold, Line height 20

### Spacing
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 24px
- **xxl**: 32px

## 📊 Data Models

### User
- Personal health info
- Cycle parameters
- Privacy settings
- Preferences

### Period Entry
- Start/end dates
- Flow intensity
- Symptoms
- Mood data
- Notes

### Mood Entry
- Mood score (1-5)
- Stress level
- Energy level
- Sleep hours
- Water intake
- Exercise type

### AI Insight
- Title & description
- Insight type (prediction, trend, recommendation)
- Confidence score
- Related metrics

## 🔄 Cycle Calculations

The app uses sophisticated algorithms for:

- **Cycle Length**: Average of last 6 cycles
- **Ovulation Date**: Calculated as day 14 (adjustable)
- **Fertility Window**: 5 days before ovulation + ovulation day
- **Irregularity Detection**: Standard deviation > 7 days
- **Phase Prediction**: Based on average cycle

## 🚀 Getting Started Guide

### First Time Users

1. **Onboarding** (6 steps)
   - Welcome
   - Basic health info
   - Cycle details
   - Preferences
   - Privacy settings
   - Ready to go!

2. **Initial Setup**
   - Set your name and date of birth
   - Input average cycle length
   - Set period duration
   - Enable notifications

3. **Start Tracking**
   - Log today's symptoms
   - Complete daily check-in
   - View your calendar
   - Check insights

## 🔐 Privacy & Security Features

✅ **GDPR Compliant**
✅ **End-to-End Encrypted** data
✅ **Biometric Lock** option
✅ **PIN Protection** available
✅ **Data Export** capability
✅ **Account Deletion** support
✅ **Privacy Policy** included
✅ **Transparent** data handling

## 📲 Firebase Integration (Optional)

To enable cloud sync and authentication:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Add your Firebase config to `src/services/firebase.ts`
3. Enable Firestore and Authentication
4. Set up security rules for privacy

```typescript
// Example Firebase setup
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 🎬 Animations & Micro-interactions

### Smooth Transitions
- Page transitions use `FadeInUp` animations
- Card reveals with staggered delays
- Smooth icon animations

### Button Feedback
- Haptic feedback on press
- Ripple animations
- Scale transforms

### Data Visualization
- Animated progress bars
- Smooth calendar transitions
- Animated counter updates

## 🛠️ Development

### Available Scripts

```bash
# Start development
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web

# Lint code
npm run lint

# Type check
npm run type-check
```

### State Management (Zustand)

```typescript
import { useAppStore } from '@/store/appStore';

function MyComponent() {
  const { user, periodEntries, addMoodEntry } = useAppStore();
  // Use state...
}
```

### Adding New Screens

1. Create screen in `src/screens/MyScreen.tsx`
2. Add to navigation in `src/navigation/RootNavigator.tsx`
3. Import and register routes

## 🐛 Troubleshooting

### Build Issues
- Clear cache: `npm start -- --reset-cache`
- Reinstall deps: `rm -rf node_modules && npm install`
- Clear Expo cache: `expo-cli: expo cache clean`

### Performance
- Use React.memo for expensive components
- Implement FlatList for long lists
- Optimize animations with `useAnimatedStyle`

## 📋 Deployment

### iOS (App Store)
```bash
eas build --platform ios
eas submit --platform ios
```

### Android (Google Play)
```bash
eas build --platform android
eas submit --platform android
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please follow the code style and add tests for new features.

## 📧 Support

For support, email support@periodtracker.app or visit our website.

## 🎯 Future Roadmap

- [ ] Partner sharing mode
- [ ] AI-powered health insights
- [ ] Wearable integration
- [ ] Advanced analytics dashboard
- [ ] Export to PDF reports
- [ ] Doctor-ready summaries
- [ ] Multiple language support
- [ ] Offline mode improvements
- [ ] Custom notifications
- [ ] Dark mode toggle

---

**Made with ❤️ for women's health**

*An AI-powered menstrual health companion designed to exceed your expectations with beautiful design, smart insights, and privacy-first approach.*
