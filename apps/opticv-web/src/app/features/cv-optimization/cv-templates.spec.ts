import {
  ACCENT_AWARE_TEMPLATE_IDS,
  CV_ACCENT_COLORS,
  CV_TEMPLATES,
  DEFAULT_ACCENT_COLOR,
} from './cv-templates';
import type { CvTemplateId } from './cv-templates';

describe('CV_TEMPLATES', () => {
  it('contains exactly 6 templates', () => {
    expect(CV_TEMPLATES.length).toBe(6);
  });

  it('has ids bold, classic, modern, corporate, minimal, impact in order', () => {
    const ids: CvTemplateId[] = CV_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual([
      'bold',
      'classic',
      'modern',
      'corporate',
      'minimal',
      'impact',
    ]);
  });

  it('each template has a non-empty name and description', () => {
    for (const t of CV_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it('all ids are unique', () => {
    const ids = CV_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('CV_ACCENT_COLORS', () => {
  it('contains exactly 5 entries', () => {
    expect(CV_ACCENT_COLORS.length).toBe(5);
  });

  it('has ids emerald, blue, purple, red, teal', () => {
    const ids = CV_ACCENT_COLORS.map((c) => c.id);
    expect(ids).toEqual(['emerald', 'blue', 'purple', 'red', 'teal']);
  });

  it('each hex matches a 6-digit hex color format', () => {
    for (const c of CV_ACCENT_COLORS) {
      expect(c.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('all ids are unique', () => {
    const ids = CV_ACCENT_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('DEFAULT_ACCENT_COLOR', () => {
  it('equals the emerald entry hex', () => {
    const emerald = CV_ACCENT_COLORS.find((c) => c.id === 'emerald');
    expect(DEFAULT_ACCENT_COLOR).toBe(emerald?.hex);
  });
});

describe('ACCENT_AWARE_TEMPLATE_IDS', () => {
  it('equals bold, modern, corporate, impact (order-independent)', () => {
    expect(new Set(ACCENT_AWARE_TEMPLATE_IDS)).toEqual(
      new Set(['bold', 'modern', 'corporate', 'impact']),
    );
  });
});
