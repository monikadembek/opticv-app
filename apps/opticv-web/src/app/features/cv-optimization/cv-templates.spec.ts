import { CV_TEMPLATES } from './cv-templates';
import type { CvTemplateId } from './cv-templates';

describe('CV_TEMPLATES', () => {
  it('contains exactly 3 templates', () => {
    expect(CV_TEMPLATES.length).toBe(3);
  });

  it('has ids ats, modern, executive in order', () => {
    const ids: CvTemplateId[] = CV_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(['ats', 'modern', 'executive']);
  });

  it('each template has a non-empty name, description and accentColor', () => {
    for (const t of CV_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('all ids are unique', () => {
    const ids = CV_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
