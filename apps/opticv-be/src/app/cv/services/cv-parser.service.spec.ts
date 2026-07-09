import { CvParserService, UnsupportedMimeTypeError } from './cv-parser.service';

jest.mock('mammoth', () => ({ extractRawText: jest.fn() }));

import * as mammoth from 'mammoth';

const mockMammoth = mammoth as unknown as { extractRawText: jest.Mock };

describe('CvParserService', () => {
  let service: CvParserService;
  const buffer = Buffer.from('test');

  beforeEach(() => {
    service = new CvParserService();
    jest.clearAllMocks();
  });

  it('DOCX success — returns extracted text', async () => {
    mockMammoth.extractRawText.mockResolvedValue({ value: 'hello docx' });
    const result = await service.parse(
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(result).toBe('hello docx');
  });

  it('empty DOCX — resolves with empty string', async () => {
    mockMammoth.extractRawText.mockResolvedValue({ value: '' });
    const result = await service.parse(
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(result).toBe('');
  });

  it('unsupported MIME type — throws UnsupportedMimeTypeError', async () => {
    await expect(service.parse(buffer, 'image/png')).rejects.toBeInstanceOf(
      UnsupportedMimeTypeError,
    );
  });
});
