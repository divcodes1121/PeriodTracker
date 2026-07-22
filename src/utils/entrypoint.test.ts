import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Guards the entry point's import order.
 *
 * `uuid` v4 calls `crypto.getRandomValues()`, which React Native does not
 * provide. Browsers do, so every uuid call worked in the web preview and threw
 * on a real device the instant onboarding tried to mint a user id — the app
 * crashed on the first screen a new user ever completes.
 *
 * The fix is a polyfill whose only requirement is that it is evaluated BEFORE
 * anything reaches for uuid. That makes it uniquely fragile: it looks like a
 * stray side-effect import, an auto-formatter or a tidy-up could reorder it,
 * and nothing would fail until someone installed a real build. Hence a test
 * asserting position rather than mere presence.
 */

const entry = readFileSync(join(__dirname, '../../index.ts'), 'utf8');

describe('app entry point', () => {
  it('imports the crypto polyfill', () => {
    expect(entry).toContain('react-native-get-random-values');
  });

  it('imports it before anything else', () => {
    const imports = entry
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('import '));
    expect(imports[0]).toContain('react-native-get-random-values');
  });

  it('keeps it as a bare side-effect import', () => {
    // `import x from '...'` would suggest someone thought it exported something
    // and may have moved it somewhere "tidier".
    expect(entry).toMatch(/^import 'react-native-get-random-values';$/m);
  });
});

describe('uuid usage', () => {
  it('is only reached from code the polyfill protects', () => {
    // If uuid is ever imported at module scope somewhere evaluated before the
    // entry point runs, the polyfill cannot help.
    expect(entry.indexOf('react-native-get-random-values')).toBeLessThan(
      entry.indexOf('./src/App')
    );
  });
});
