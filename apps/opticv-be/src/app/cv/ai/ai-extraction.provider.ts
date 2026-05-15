import type { CvStructuredData } from '@opticv/datatypes';

export abstract class AiExtractionProvider {
  abstract extract(text: string): Promise<CvStructuredData>;
}
