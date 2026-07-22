/**
 * Polyfill FIRST, before anything else is imported.
 *
 * `uuid` v4 calls `crypto.getRandomValues()`, which React Native does not
 * provide. Browsers do — so every uuid call worked perfectly in the web preview
 * and threw the moment it ran on a real device. That is what crashed the app on
 * submitting onboarding: OnboardingScreen mints the user id with uuidv4().
 *
 * Import order is load-bearing. This must be evaluated before any module that
 * reaches for uuid, so it cannot be moved below the App import or tidied into
 * an alphabetised block.
 */
import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';

import App from './src/App';

registerRootComponent(App);
