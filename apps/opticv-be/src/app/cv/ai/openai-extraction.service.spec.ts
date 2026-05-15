import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OpenAiExtractionService } from './openai-extraction.service';

const mockCreate = jest.fn();

jest.mock('openai', () => {
  const ctor = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
  ctor.default = ctor;
  return ctor;
});

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-api-key'),
};

const makeResponse = (content: string | null) => ({
  choices: [{ message: { content } }],
});

describe('OpenAiExtractionService', () => {
  let service: OpenAiExtractionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiExtractionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OpenAiExtractionService>(OpenAiExtractionService);
  });

  it('calls OpenAI with the correct model, response format, and messages', async () => {
    const structuredData = { contact: { name: 'Jane' } };
    mockCreate.mockResolvedValueOnce(makeResponse(JSON.stringify(structuredData)));

    await service.extract('CV text here');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          { role: 'user', content: 'CV text here' },
        ]),
      }),
    );
  });

  it('returns parsed structured data on success', async () => {
    const structuredData = { contact: { name: 'Jane' }, skills: ['TypeScript'] };
    mockCreate.mockResolvedValueOnce(makeResponse(JSON.stringify(structuredData)));

    const result = await service.extract('some cv text');

    expect(result).toEqual(structuredData);
  });

  it('throws when OpenAI returns an empty response', async () => {
    mockCreate.mockResolvedValueOnce(makeResponse(null));

    await expect(service.extract('text')).rejects.toThrow(
      'OpenAI returned an empty response',
    );
  });

  it('throws when OpenAI returns non-JSON content', async () => {
    mockCreate.mockResolvedValueOnce(makeResponse('not json at all'));

    await expect(service.extract('text')).rejects.toThrow(
      'OpenAI returned non-JSON content',
    );
  });

  it('throws when OpenAI returns a JSON primitive instead of an object', async () => {
    mockCreate.mockResolvedValueOnce(makeResponse('42'));

    await expect(service.extract('text')).rejects.toThrow(
      'OpenAI returned a non-object JSON value',
    );
  });

  it('throws when OpenAI returns a JSON null', async () => {
    mockCreate.mockResolvedValueOnce(makeResponse('null'));

    await expect(service.extract('text')).rejects.toThrow(
      'OpenAI returned a non-object JSON value',
    );
  });

  it('propagates errors thrown by the OpenAI client', async () => {
    mockCreate.mockRejectedValueOnce(new Error('network timeout'));

    await expect(service.extract('text')).rejects.toThrow('network timeout');
  });
});
