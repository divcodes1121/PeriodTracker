import { lightPalette, darkPalette } from './palette';
import { COLORS, PHASE_DEEP, PHASE_INK, PHASE_GLYPH, INK, DEEP, BLOOM, BloomHue } from '../constants';

/**
 * WCAG AA contrast audit for the palette.
 *
 * This exists because "accessible" is a claim that rots silently: someone
 * nudges a grey two steps lighter and nothing fails until a user can't read
 * the app. Encoding the ratios makes the palette's promises enforceable.
 *
 * Thresholds (WCAG 2.1):
 *  - 4.5:1 normal text (anything under 18.66px bold / 24px regular — which is
 *    every label in this app, including the 11px overlines)
 *  - 3:1  UI components and graphical objects (1.4.11)
 */

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const TEXT = 4.5;
const UI = 3;

/**
 * Bloomly ships every brand hue in three values — pastel (petal), deep (stem),
 * ink (soil). This block is the enforcement mechanism for that system: it is
 * what makes "use the right value" a build failure rather than a code-review
 * comment somebody forgets to leave.
 */
describe('the three-value system', () => {
  const hues = Object.keys(BLOOM) as BloomHue[];

  it.each(hues)('%s: ink carries text on both cream and blush', (hue) => {
    // Both ends of the canvas gradient. A label that clears AA at the top of
    // the page and fails at the bottom is still a failure — it just fails
    // somewhere nobody screenshotted.
    expect(contrast(BLOOM[hue].ink, lightPalette.card)).toBeGreaterThanOrEqual(TEXT);
    expect(contrast(BLOOM[hue].ink, lightPalette.bgDeep)).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(hues)('%s: ink carries a white label when used as a filled surface', (hue) => {
    expect(contrast('#FFFFFF', BLOOM[hue].ink)).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(hues)('%s: deep clears the UI threshold for strokes and dots', (hue) => {
    expect(contrast(BLOOM[hue].deep, lightPalette.card)).toBeGreaterThanOrEqual(UI);
    expect(contrast(BLOOM[hue].deep, lightPalette.bgDeep)).toBeGreaterThanOrEqual(UI);
  });

  it.each(hues)('%s: pastel carries text on the plum card in dark mode', (hue) => {
    expect(contrast(BLOOM[hue].pastel, darkPalette.card)).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(hues)('%s: pastel is deliberately too light for text on cream', (hue) => {
    // Documents *why* deep and ink exist. If this ever passes, someone has
    // darkened a pastel and the illustrations will have gone muddy.
    expect(contrast(BLOOM[hue].pastel, lightPalette.card)).toBeLessThan(TEXT);
  });

  it('maps every pastel to both an ink and a deep', () => {
    for (const hue of hues) {
      expect(INK[BLOOM[hue].pastel]).toBe(BLOOM[hue].ink);
      expect(DEEP[BLOOM[hue].pastel]).toBe(BLOOM[hue].deep);
    }
  });
});

describe('light theme contrast', () => {
  const p = lightPalette;

  it.each([
    ['primary text on canvas', p.text, p.bg, TEXT],
    ['primary text on canvas bottom', p.text, p.bgDeep, TEXT],
    ['primary text on card', p.text, p.card, TEXT],
    ['secondary text on canvas', p.textSecondary, p.bg, TEXT],
    ['secondary text on canvas bottom', p.textSecondary, p.bgDeep, TEXT],
    ['secondary text on card', p.textSecondary, p.card, TEXT],
    ['brand text on card', COLORS.primaryDark, p.card, TEXT],
    ['accent text on card', COLORS.accentDark, p.card, TEXT],
    ['success text on card', COLORS.successDark, p.card, TEXT],
    ['warning text on card', COLORS.warningDark, p.card, TEXT],
    ['error text on card', COLORS.error, p.card, TEXT],
    ['white label on filled button', '#FFFFFF', COLORS.primaryDark, TEXT],
  ])('%s meets AA for text', (_label, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it('tertiary is legible as a UI element but is not used for text', () => {
    // Deliberately below the text threshold: textTertiary is reserved for
    // chevrons, dots and placeholders. Meaningful labels use textSecondary.
    expect(contrast(p.textTertiary, p.card)).toBeGreaterThanOrEqual(UI);
  });
});

describe('dark theme contrast', () => {
  const p = darkPalette;

  it.each([
    ['primary text on canvas', p.text, p.bg, TEXT],
    ['primary text on card', p.text, p.card, TEXT],
    ['secondary text on card', p.textSecondary, p.card, TEXT],
    ['brand text on card', COLORS.primary, p.card, TEXT],
    ['accent text on card', COLORS.accent, p.card, TEXT],
    ['success text on card', COLORS.success, p.card, TEXT],
    ['warning text on card', COLORS.warning, p.card, TEXT],
  ])('%s meets AA for text', (_label, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it('tertiary is legible as a UI element', () => {
    expect(contrast(p.textTertiary, p.card)).toBeGreaterThanOrEqual(UI);
  });
});

describe('Rose usage guard', () => {
  it('is too light to carry white text, which is why filled controls use primaryDark', () => {
    // Documents the constraint that shaped the palette: if this ever passes,
    // the brand color changed and Button/Toggle should be revisited.
    expect(contrast('#FFFFFF', COLORS.primary)).toBeLessThan(TEXT);
  });
});

/**
 * The colour-blind backbone.
 *
 * Bloomly's phase hues measurably FAIL deuteranopia separation (ΔE 3.1 worst
 * adjacent pair) and no arrangement of four soft hues passes — deuteranopia
 * collapses pink and green by definition. Rather than ship a worse app to
 * colour-blind users, phase identity was moved onto four silhouettes.
 *
 * These tests are what stop someone quietly reverting to coloured dots.
 */
describe('phase identity does not depend on colour', () => {
  const phases = ['menstrual', 'follicular', 'ovulation', 'luteal'] as const;

  it('gives every phase its own glyph', () => {
    const glyphs = phases.map((p) => PHASE_GLYPH[p]);
    expect(new Set(glyphs).size).toBe(phases.length);
  });

  it('covers every phase — a missing glyph would silently fall back to colour', () => {
    for (const p of phases) {
      expect(PHASE_GLYPH[p]).toBeTruthy();
    }
  });

  it('records the four expected silhouettes', () => {
    // Pinned by name because the *specific* shapes were chosen to be
    // unconfusable: a radial burst, a crescent, a teardrop and a leaf share no
    // silhouette family. Swapping one for, say, a second round shape would
    // pass the distinctness test above while quietly undoing the point.
    expect(PHASE_GLYPH).toEqual({
      menstrual: 'drop',
      follicular: 'leaf',
      ovulation: 'sun',
      luteal: 'moon',
    });
  });
});

describe('the never-plain-white rule', () => {
  it('keeps the canvas warm and the card cream, not both #FFFFFF', () => {
    // Bloomly separates card from canvas by a small luminance step plus a wide
    // warm shadow, which is only possible if they are different colours. The
    // moment both go pure white, cards need borders — and a bordered pastel
    // card reads as a sticker, not a surface.
    expect(lightPalette.bg).not.toBe('#FFFFFF');
    expect(lightPalette.bgDeep).not.toBe('#FFFFFF');
    expect(darkPalette.bg).not.toBe('#000000');
    expect(lightPalette.card).not.toBe(lightPalette.bgDeep);
    expect(lightPalette.cardBorder).toBe('transparent');
    expect(darkPalette.cardBorder).toBe('transparent');
  });

  it('keeps the card lighter than the canvas it floats on', () => {
    // The direction matters: a card *darker* than its canvas reads as a hole.
    const l = (hex: string) => {
      const h = hex.replace('#', '');
      return (
        0.2126 * channel(parseInt(h.slice(0, 2), 16)) +
        0.7152 * channel(parseInt(h.slice(2, 4), 16)) +
        0.0722 * channel(parseInt(h.slice(4, 6), 16))
      );
    };
    expect(l(lightPalette.card)).toBeGreaterThan(l(lightPalette.bgDeep));
    expect(l(darkPalette.card)).toBeGreaterThan(l(darkPalette.bg));
  });
});

describe('phase color variants', () => {
  const phases = ['menstrual', 'follicular', 'ovulation', 'luteal'] as const;

  it('pastel phase colors are visible on the DARK card (UI threshold)', () => {
    for (const p of phases) {
      const pastel = (COLORS as Record<string, string>)[p];
      expect(contrast(pastel, darkPalette.card)).toBeGreaterThanOrEqual(UI);
    }
  });

  it('PHASE_DEEP variants clear the UI threshold on a WHITE card', () => {
    // These back dots, rings and today-borders in light mode.
    for (const p of phases) {
      expect(contrast(PHASE_DEEP[p], lightPalette.card)).toBeGreaterThanOrEqual(UI);
    }
  });

  it('PHASE_INK variants carry white text at AA (selected calendar day)', () => {
    for (const p of phases) {
      expect(contrast('#FFFFFF', PHASE_INK[p])).toBeGreaterThanOrEqual(TEXT);
    }
  });
});

describe('icon-on-tint ink map', () => {
  it('every inked accent clears the UI threshold on its own light tint', () => {
    // A glyph coloured inkFor(accent) sits on a `${accent}1F` tile. Approximate
    // that tile by compositing 12% of the accent over white, then check the ink
    // against it. All four brand pastels must pass.
    const over = (hex: string, a: number) => {
      const h = hex.replace('#', '');
      const mix = (c: number) => Math.round(c * a + 255 * (1 - a));
      const r = mix(parseInt(h.slice(0, 2), 16));
      const g = mix(parseInt(h.slice(2, 4), 16));
      const b = mix(parseInt(h.slice(4, 6), 16));
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    };
    for (const [pastel, ink] of Object.entries(INK)) {
      const tile = over(pastel, 0.12);
      expect(contrast(ink, tile)).toBeGreaterThanOrEqual(UI);
    }
  });
});
