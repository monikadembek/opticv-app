export type CvTemplateId = 'ats' | 'modern' | 'executive';

export interface CvTemplate {
  id: CvTemplateId;
  name: string;
  description: string;
  accentColor: string;
}

export const CV_TEMPLATES: CvTemplate[] = [
  {
    id: 'ats',
    name: 'Default',
    description: 'Single column, maximum ATS compatibility',
    accentColor: '#2a9d8f',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Single column, subtle accents, ATS-safe',
    accentColor: '#e63946',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Single column, elegant, ATS-safe',
    accentColor: '#7b2d8b',
  },
];
