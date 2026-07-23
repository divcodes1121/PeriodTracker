// Screenshot the running Bloomly web preview, seeded past onboarding.
// Traps this workflow has already hit (see CLAUDE.md gotcha #8):
//   - inactive tabs stay MOUNTED, so finding an element proves nothing
//   - puppeteer's auto-scroll does not work inside RN-web ScrollViews
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8082';
const OUT = process.argv[2] || 'shot';
const DARK = process.argv[3] === 'dark';

const now = new Date();
const iso = (d) => new Date(d).toISOString();
// Day 3 of the cycle so the Bloom Ring shows a partly-open flower, and enough
// history that the garden has grown past bare soil.
const lastPeriod = new Date(now.getTime() - 2 * 864e5);

const seed = {
  state: {
    user: {
      id: 'u1',
      email: 'a@b.co',
      name: 'Divyanshu',
      dateOfBirth: iso('1998-05-04'),
      cycleLength: 28,
      periodLength: 5,
      averageCycleLength: 28,
      lastPeriodStart: iso(lastPeriod),
      createdAt: iso(now),
      updatedAt: iso(now),
      privacySettings: { biometricLock: false, pinLock: null, allowPartnerMode: false, dataEncrypted: true },
      preferences: { theme: DARK ? 'dark' : 'light', notifications: true, aiInsights: true, language: 'en' },
    },
    theme: DARK ? 'dark' : 'light',
    showOnboarding: false,
    enableNotifications: true,
    enableAIInsights: true,
    periodEntries: [0, 28, 57].map((d, i) => ({
      id: 'p' + i,
      userId: 'u1',
      startDate: iso(new Date(lastPeriod.getTime() - d * 864e5)),
      endDate: iso(new Date(lastPeriod.getTime() - (d - 5) * 864e5)),
      flowIntensity: 'medium',
      symptoms: [],
      mood: null,
      notes: '',
      createdAt: iso(now),
      updatedAt: iso(now),
    })),
    symptomLogs: Array.from({ length: 9 }, (_, i) => ({
      id: 's' + i,
      userId: 'u1',
      date: iso(new Date(now.getTime() - (i * 3 + 1) * 864e5)),
      symptoms: [{ id: 'x' + i, type: 'cramps', severity: 3, timestamp: iso(now) }],
      flowIntensity: 'none',
      notes: '',
      createdAt: iso(now),
      updatedAt: iso(now),
    })),
    moodEntries: Array.from({ length: 8 }, (_, i) => ({
      id: 'm' + i,
      userId: 'u1',
      timestamp: iso(new Date(now.getTime() - (i * 4 + 2) * 864e5)),
      mood: 3 + (i % 3) - 1,
      stress: 3,
      energy: 3,
      sleep: 7,
      waterIntake: 8,
      exercise: '',
      notes: '',
      createdAt: iso(now),
    })),
    healthMetrics: [],
    aiInsights: [],
    partnerAccess: [],
    resetSessions: [{ id: 'r1', userId: 'u1', escapeId: 'zen', startedAt: iso(now), plannedSec: 120, actualSec: 130, response: 'better', createdAt: iso(now) }],
  },
  version: 0,
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=2'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 2 });
  if (DARK) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => localStorage.setItem('period-tracker-store', s), JSON.stringify(seed));
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 6000));

  await page.screenshot({ path: `${OUT}-home.png` });
  console.log('captured', OUT);

  // Navigate for real. Tabs are role="tab", matched by their visible text --
  // an inactive tab's DOM is still mounted, so querying is not proof of view.
  const goTab = async (name) => {
    const ok = await page.evaluate((n) => {
      const tabs = [...document.querySelectorAll('[role="tab"]')];
      const t = tabs.find((el) => (el.innerText || '').trim().toLowerCase().includes(n));
      if (t) { t.click(); return true; }
      return false;
    }, name);
    if (!ok) console.log('tab not found:', name);
    await new Promise((r) => setTimeout(r, 2500));
  };

  for (const tab of ['calendar', 'analytics', 'settings']) {
    await goTab(tab);
    await page.screenshot({ path: `${OUT}-${tab}.png` });
    console.log('captured', tab);
  }

  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
