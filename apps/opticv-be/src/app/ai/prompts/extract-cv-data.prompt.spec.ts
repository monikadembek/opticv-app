import { EXTRACTION_SYSTEM_PROMPT } from './extract-cv-data.prompt';

describe('EXTRACTION_SYSTEM_PROMPT', () => {
  it('includes the gdprClause field in the extraction schema', () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toContain('"gdprClause": string or null');
  });

  it('includes a rule describing how to extract the gdprClause field', () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toMatch(
      /gdprClause.*GDPR|GDPR.*gdprClause/i,
    );
  });
});
