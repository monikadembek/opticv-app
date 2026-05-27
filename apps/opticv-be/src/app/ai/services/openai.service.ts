import { Injectable, Logger } from '@nestjs/common';
import { CV_EXTRACTION_OPENAI_MODEL } from '../../constants';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { EXTRACTION_SYSTEM_PROMPT } from '../prompts/extract-cv-data.prompt';
import { CvStructuredData } from '@opticv/datatypes';

@Injectable()
export class OpenAiService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAiService.name);

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('openai.apiKey'),
    });
  }

  async extractCvData(text: string): Promise<CvStructuredData> {
    this.logger.log('Calling OpenAI gpt-4o-mini for CV extraction');

    const response = await this.client.chat.completions.create({
      model: CV_EXTRACTION_OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('OpenAI returned non-JSON content');
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('OpenAI returned a non-object JSON value');
    }

    return parsed as CvStructuredData;
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    outputSchema?: { name: string; input_schema: Record<string, unknown> } | null,
  ): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
    const responseFormat = outputSchema
      ? ({
          type: 'json_schema' as const,
          json_schema: {
            name: outputSchema.name,
            schema: outputSchema.input_schema,
            strict: false,
          },
        } as const)
      : undefined;

    const response = await this.client.chat.completions.create({
      model,
      ...(responseFormat && { response_format: responseFormat }),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }

    return {
      content,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
    };
  }
}
