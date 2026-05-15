import { Injectable, NotFoundException } from '@nestjs/common';
import { PromptType } from '../../generated/prisma/enums.js';
import type { PromptVersionModel } from '../../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PromptVariables } from './prompt.types.js';

const SHARED_CONTEXT = `
<resume>
{{resumeText}}
</resume>

<parsed_resume_sections>
{{parsedSectionsJson}}
</parsed_resume_sections>

<job_description>
{{jobDescription}}
</job_description>

<context>
Target role: {{targetRole}}
Target seniority: {{seniority}}
Industry: {{industry}}
Years of experience: {{yearsExperience}}
</context>
`;

function interpolate(str: string, vars: Record<string, string | undefined>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? match);
}

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaService) {}

  buildUserPrompt(template: string, vars: PromptVariables): string {
    const varsMap = vars as unknown as Record<string, string | undefined>;
    const sharedContext = interpolate(SHARED_CONTEXT, varsMap);
    const withShared = template.replace('{{SHARED_CONTEXT}}', sharedContext);
    return interpolate(withShared, varsMap);
  }

  async getActivePrompt(promptType: PromptType): Promise<PromptVersionModel> {
    const prompt = await this.prisma.promptVersion.findFirst({
      where: { promptType, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt not found for type: ${promptType}`);
    }

    return prompt;
  }
}
