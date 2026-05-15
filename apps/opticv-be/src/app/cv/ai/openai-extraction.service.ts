import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { CvStructuredData } from '@opticv/datatypes';
import { AiExtractionProvider } from './ai-extraction.provider';
import { EXTRACTION_SYSTEM_PROMPT } from './extraction-prompt';
import { CV_EXTRACTION_OPENAI_MODEL } from '../../constants';

@Injectable()
export class OpenAiExtractionService extends AiExtractionProvider {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAiExtractionService.name);

  constructor(private readonly config: ConfigService) {
    super();
    this.client = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async extract(text: string): Promise<CvStructuredData> {
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
}
