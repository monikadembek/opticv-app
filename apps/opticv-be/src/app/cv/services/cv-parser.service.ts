import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';

export class UnsupportedMimeTypeError extends Error {
  constructor(mimeType: string) {
    super(`Unsupported MIME type: ${mimeType}`);
    this.name = 'UnsupportedMimeTypeError';
  }
}

@Injectable()
export class CvParserService {
  async parse(buffer: Buffer, mimeType: string): Promise<string> {
    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    throw new UnsupportedMimeTypeError(mimeType);
  }
}
