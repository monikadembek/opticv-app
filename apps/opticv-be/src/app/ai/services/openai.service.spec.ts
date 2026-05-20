import { ConfigService } from '@nestjs/config';
import { OpenAiService } from './openai.service.js';

const mockCreate = jest.fn();

const mockOpenAIClient = {
  chat: {
    completions: {
      create: mockCreate,
    },
  },
};

const makeCompletion = (content: string, promptTokens = 100, completionTokens = 50) => ({
  choices: [{ message: { content } }],
  usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens },
});

const makeService = () => {
  const configService = { get: jest.fn().mockReturnValue('test-api-key') } as unknown as ConfigService;
  const service = new OpenAiService(configService);
  // Bypass the real OpenAI constructor by replacing the private client
  (service as unknown as { client: typeof mockOpenAIClient }).client = mockOpenAIClient;
  return service;
};

describe('OpenAiService', () => {
  let service: OpenAiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();
  });

  describe('generateCompletion', () => {
    const outputSchema = {
      name: 'submit_audit',
      input_schema: { type: 'object', properties: { score: { type: 'integer' } } } as Record<string, unknown>,
    };

    it('uses json_schema response_format when outputSchema is provided', async () => {
      mockCreate.mockResolvedValue(makeCompletion('{"score":85}'));

      const result = await service.generateCompletion('sys', 'user', 'gpt-4o', outputSchema);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'submit_audit',
              schema: outputSchema.input_schema,
              strict: false,
            },
          },
        }),
      );
      expect(result).toEqual({ content: '{"score":85}', promptTokens: 100, completionTokens: 50 });
    });

    it('omits response_format when outputSchema is not provided', async () => {
      mockCreate.mockResolvedValue(makeCompletion('plain text'));

      await service.generateCompletion('sys', 'user', 'gpt-4o-mini');

      const callArg = mockCreate.mock.calls[0][0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('response_format');
    });

    it('omits response_format when outputSchema is null', async () => {
      mockCreate.mockResolvedValue(makeCompletion('plain text'));

      await service.generateCompletion('sys', 'user', 'gpt-4o-mini', null);

      const callArg = mockCreate.mock.calls[0][0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('response_format');
    });

    it('passes system and user messages', async () => {
      mockCreate.mockResolvedValue(makeCompletion('ok'));

      await service.generateCompletion('system prompt', 'user prompt', 'gpt-4o');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'system prompt' },
            { role: 'user', content: 'user prompt' },
          ],
        }),
      );
    });

    it('returns token counts from usage', async () => {
      mockCreate.mockResolvedValue(makeCompletion('result', 200, 75));

      const result = await service.generateCompletion('sys', 'user', 'gpt-4o');

      expect(result.promptTokens).toBe(200);
      expect(result.completionTokens).toBe(75);
    });

    it('defaults token counts to 0 when usage is absent', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });

      const result = await service.generateCompletion('sys', 'user', 'gpt-4o');

      expect(result.promptTokens).toBe(0);
      expect(result.completionTokens).toBe(0);
    });

    it('throws when OpenAI returns empty content', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });

      await expect(service.generateCompletion('sys', 'user', 'gpt-4o')).rejects.toThrow(
        'OpenAI returned an empty response',
      );
    });
  });
});
