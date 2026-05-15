import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export class UnsupportedMimeTypeError extends Error {
  constructor(mimeType: string) {
    super(`Unsupported MIME type: ${mimeType}`);
    this.name = 'UnsupportedMimeTypeError';
  }
}

@Injectable()
export class CvParserService {
  async parse(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return result.text;
    }

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
