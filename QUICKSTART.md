# 🚀 Period Tracker - Quick Start & Deployment Guide

## ⚡ Quick Start (5 minutes)

### 1. Install & Run

```bash
cd PeriodTracker
npm install
npm start
```

### 2. Open on Device/Emulator

**iOS (Simulator)**
```bash
npm run ios
```

**Android (Emulator)**
```bash
npm run android
```

**Web (Browser)**
```bash
npm run web
```

### 3. Test the App
1. Complete onboarding (follow the 6-step flow)
2. Fill in your personal health info
3. Explore the home dashboard
4. Try logging symptoms and moods
5. Check the calendar and analytics

---

## 📱 Project Structure at a Glance

```
PeriodTracker/
├── src/
│   ├── app/                    # Expo Router entry point
│   │   ├── _layout.tsx        # Root layout with navigation
│   │   └── index.tsx          # App entry
│   ├── screens/                # 8 main screens
│   ├── components/             # Reusable UI components
│   ├── store/                  # Zustand state (appStore.ts)
│   ├── utils/                  # Cycle calculation logic
│   ├── constants/              # Colors, spacing, themes
│   ├── types/                  # TypeScript interfaces
│   └── navigation/             # Navigation configuration
├── assets/                     # Images, icons
├── app.json                    # Expo configuration
├── package.json                # Dependencies
└── tsconfig.json               # TypeScript config
```

---

## 🎯 File Guide - What Each Component Does

### Screens (8 Total)

| Screen | File | Purpose |
|--------|------|---------|
| 🏠 Home Dashboard | `HomeScreen.tsx` | Main hub showing cycle phase, next period, fertility window |
| 📅 Calendar | `CalendarScreen.tsx` | Month view of cycle with phase colors and predictions |
| 🎭 Mood Tracker | `MoodTrackerScreen.tsx` | Daily check-in: mood, stress, energy, sleep, water |
| 📊 Symptoms Logger | `SymptomLoggerScreen.tsx` | Log 10+ symptoms with severity ratings |
| 📈 Analytics | `AnalyticsScreen.tsx` | Trends, cycle stats, mood patterns |
| ✨ AI Insights | `AIInsightsScreen.tsx` | Personalized health predictions & recommendations |
| ⚙️ Settings | `SettingsScreen.tsx` | Profile, notifications, privacy, data export |
| 🎯 Onboarding | `OnboardingScreen.tsx` | 6-step setup wizard for new users |

### Components (Reusable)

| Component | File | Usage |
|-----------|------|-------|
| Primary Button | `Button.tsx` | All interactive buttons |
| Card Container | `Card.tsx` | Content containers with shadow |
| Animated Card | `AnimatedCard.tsx` | Auto-animated card entrances |

### Core Logic

| File | Purpose |
|------|---------|
| `cycleCalculations.ts` | Cycle length, ovulation, fertility window calculations |
| `appStore.ts` | Global state: user, entries, preferences |
| `types/index.ts` | TypeScript interfaces for data models |
| `constants/index.ts` | Colors, spacing, themes, symptoms list |

### Navigation

| File | Purpose |
|------|---------|
| `RootNavigator.tsx` | Tab navigation setup (Home, Calendar, Analytics, Settings) |
| `_layout.tsx` | App initialization and root wrapper |

---

## 🎨 Key Features Explained

### 1. **Home Dashboard** (`HomeScreen.tsx`)
```
✅ Shows current cycle day
✅ Color-coded phase indicator
✅ Days until next period (progress bar)
✅ Fertility window countdown
✅ Quick action buttons
✅ AI insights preview
```

### 2. **Calendar** (`CalendarScreen.tsx`)
```
✅ Month view with phase colors
✅ Day selection with details
✅ Phase-specific recommendations
✅ Previous/next month navigation
✅ Color legend
```

### 3. **Mood Tracker** (`MoodTrackerScreen.tsx`)
```
✅ 5-point mood scale with emojis
✅ Stress level (1-5)
✅ Energy level (1-5)
✅ Sleep hours (4-9h)
✅ Water intake tracking
✅ Exercise notes
✅ Daily observations
```

### 4. **Symptoms Logger** (`SymptomLoggerScreen.tsx`)
```
✅ 10+ symptoms (cramps, headache, fatigue, etc.)
✅ Emoji-based UI
✅ Flow intensity selector
✅ Multiple selection
✅ Instant save
```

### 5. **Analytics** (`AnalyticsScreen.tsx`)
```
✅ Average cycle length
✅ Cycle variability
✅ Mood trends (7-day chart)
✅ Next period prediction
✅ Irregularity detection
✅ Wellness score
```

### 6. **AI Insights** (`AIInsightsScreen.tsx`)
```
✅ 4 sample insights
✅ Prediction type indicators
✅ Confidence scores
✅ Actionable recommendations
```

---

## 💾 State Management (Zustand)

The app uses a single global store for all data:

```typescript
import { useAppStore } from '@/store/appStore';

// In any component:
const { 
  user, 
  periodEntries, 
  moodEntries, 
  addMoodEntry,
  setPeriodEntries 
} = useAppStore();
```

**Stored Data:**
- User profile & preferences
- Period entries (with symptoms)
- Mood check-ins
- Health metrics
- AI insights
- Partner access permissions

---

## 🎨 Customization

### Change Primary Color

Edit `src/constants/index.ts`:
```typescript
export const COLORS = {
  primary: '#FF6B9D',  // Change this
  // ...
};
```

### Add New Symptom

Edit `src/constants/index.ts`:
```typescript
export const SYMPTOMS = {
  // ... existing
  new_symptom: { label: 'New Symptom', emoji: '🔴' },
};
```

Then update `types/index.ts` to include in `SymptomType`.

### Modify Cycle Phases

Edit `src/utils/cycleCalculations.ts` - `getCyclePhase()` function.

---

## 📊 Data Flow

```
1. User logs symptom/mood
   ↓
2. Data sent to Zustand store
   ↓
3. Component re-renders with new data
   ↓
4. (Optional) Sync to Firebase
   ↓
5. Data persists locally & in cloud
```

---

## 🚀 Building for Production

### iOS (App Store)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Build:
```bash
eas build --platform ios --auto-submit
```

3. Wait for build completion, then app is submitted to App Store.

### Android (Google Play)

1. Build:
```bash
eas build --platform android
```

2. Sign and submit:
```bash
eas submit --platform android
```

### Alternative: Local Build

**iOS (requires Mac)**
```bash
cd ios
pod install
cd ..
npm run ios -- --release
```

**Android**
```bash
npm run android -- --release
```

---

## 🔧 Development Tips

### Live Reload
The app uses Expo's fast refresh. Changes appear instantly!

### Debug in Browser
```bash
npm start
```
Then press `j` in terminal to open debugger.

### Check Types
```bash
npx tsc --noEmit
```

### Lint Code
```bash
npm run lint
```

---

## 🐛 Common Issues & Fixes

### Build Fails
```bash
# Clear everything
rm -rf node_modules package-lock.json
npm install
```

### Simulator not showing changes
```bash
npm start -- --reset-cache
```

### Port 8081 already in use
```bash
# Kill process on port 8081 (macOS/Linux)
lsof -ti:8081 | xargs kill -9

# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### Firebase errors
- Make sure Firebase config is in `src/services/firebase.ts`
- Check Firestore rules allow your operations
- Verify API keys are correct

---

## 📦 Key Dependencies

```json
{
  "react-native-reanimated": "60fps animations",
  "zustand": "State management",
  "date-fns": "Date calculations",
  "expo-linear-gradient": "Beautiful gradients",
  "expo-haptics": "Haptic feedback",
  "@react-navigation": "Navigation",
  "lottie-react-native": "Micro-animations"
}
```

---

## 🎯 Next Steps for Production

### Before Launch:

1. **Add Firebase**
   - Set up Firestore for data sync
   - Configure authentication
   - Enable offline persistence

2. **Implement Push Notifications**
   - Use Firebase Cloud Messaging
   - Set up notification schedules

3. **Add More Animations**
   - Lottie animations for achievements
   - More micro-interactions
   - Page transitions

4. **Privacy & Legal**
   - Add Privacy Policy
   - Terms of Service
   - GDPR compliance

5. **Testing**
   - Device testing (iOS + Android)
   - Edge case testing
   - Performance optimization

6. **App Store Setup**
   - Create app pages
   - Write descriptions
   - Prepare screenshots
   - Plan launch date

---

## 📞 Support & Resources

- **React Native Docs**: https://reactnative.dev
- **Expo Docs**: https://docs.expo.dev
- **TypeScript Docs**: https://www.typescriptlang.org
- **Zustand Docs**: https://github.com/pmndrs/zustand

---

## ✨ Feature Checklist

- [x] Cycle tracking & predictions
- [x] Symptom logging
- [x] Mood tracking
- [x] Analytics & trends
- [x] AI insights (mockups)
- [x] Beautiful UI/UX
- [x] Smooth animations
- [x] Settings & preferences
- [ ] Firebase integration
- [ ] Push notifications
- [ ] Biometric lock
- [ ] Partner sharing
- [ ] Advanced analytics
- [ ] Doctor reports

---

**Ready to build? Start with:**
```bash
npm start
```

**Good luck! 🌸**
