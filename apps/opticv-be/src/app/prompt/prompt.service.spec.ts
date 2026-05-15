import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PromptService } from './prompt.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const BASE_VARS = {
  resumeText: 'My resume text',
  parsedSectionsJson: '{}',
  jobDescription: 'Job desc',
  targetRole: 'Engineer',
  seniority: 'Senior',
  industry: 'Tech',
  yearsExperience: '5',
};

describe('PromptService', () => {
  let service: PromptService;
  const mockPrisma = { promptVersion: { findFirst: jest.fn() } };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PromptService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PromptService);
  });

  describe('buildUserPrompt', () => {
    it('replaces {{SHARED_CONTEXT}} with the interpolated shared context block', () => {
      const result = service.buildUserPrompt('Start\n{{SHARED_CONTEXT}}\nEnd', BASE_VARS);

      expect(result).toContain('<resume>');
      expect(result).toContain('My resume text');
      expect(result).not.toContain('{{resumeText}}');
      expect(result).not.toContain('{{SHARED_CONTEXT}}');
    });

    it('substitutes all shared context variables', () => {
      const result = service.buildUserPrompt('{{SHARED_CONTEXT}}', BASE_VARS);

      expect(result).toContain('My resume text');
      expect(result).toContain('{}');
      expect(result).toContain('Job desc');
      expect(result).toContain('Engineer');
      expect(result).toContain('Senior');
      expect(result).toContain('Tech');
      expect(result).toContain('5');
    });

    it('leaves unknown placeholders as-is when optional var is not provided', () => {
      const template = '{{SHARED_CONTEXT}}\nHiring manager: {{hiringManagerName}}';
      const result = service.buildUserPrompt(template, BASE_VARS);

      expect(result).toContain('{{hiringManagerName}}');
    });

    it('substitutes extra cover letter vars when provided', () => {
      const template = '{{SHARED_CONTEXT}}\nHiring manager: {{hiringManagerName}}';
      const result = service.buildUserPrompt(template, {
        ...BASE_VARS,
        hiringManagerName: 'Sarah',
      });

      expect(result).toContain('Sarah');
      expect(result).not.toContain('{{hiringManagerName}}');
    });

    it('substitutes LinkedIn vars when provided', () => {
      const template = '{{SHARED_CONTEXT}}\nHeadline: {{linkedinHeadline}}';
      const result = service.buildUserPrompt(template, {
        ...BASE_VARS,
        linkedinHeadline: 'Senior Engineer | TypeScript | Node.js',
      });

      expect(result).toContain('Senior Engineer | TypeScript | Node.js');
      expect(result).not.toContain('{{linkedinHeadline}}');
    });
  });

  describe('getActivePrompt', () => {
    it('returns the prompt when found', async () => {
      const mockPrompt = { id: '1', promptType: 'RESUME_AUTOPSY', isActive: true };
      mockPrisma.promptVersion.findFirst.mockResolvedValue(mockPrompt);

      const result = await service.getActivePrompt('RESUME_AUTOPSY' as any);

      expect(result).toBe(mockPrompt);
    });

    it('throws NotFoundException when no active prompt exists', async () => {
      mockPrisma.promptVersion.findFirst.mockResolvedValue(null);

      await expect(service.getActivePrompt('RESUME_AUTOPSY' as any)).rejects.toThrow(NotFoundException);
    });
  });
});
