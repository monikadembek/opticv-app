import { ApiProperty } from '@nestjs/swagger';

export class CvContactInfoDto {
  @ApiProperty({ nullable: true, example: 'Jane Doe' })
  name!: string | null;

  @ApiProperty({ nullable: true, example: 'Software Engineer' })
  position!: string | null;

  @ApiProperty({ nullable: true, example: 'jane@example.com' })
  email!: string | null;

  @ApiProperty({ nullable: true, example: '+48 123 456 789' })
  phone!: string | null;

  @ApiProperty({ nullable: true, example: 'Warsaw, Poland' })
  location!: string | null;

  @ApiProperty({ nullable: true, example: 'https://linkedin.com/in/janedoe' })
  linkedin!: string | null;

  @ApiProperty({ nullable: true, example: 'https://janedoe.dev' })
  website!: string | null;
}

export class CvExperienceItemDto {
  @ApiProperty({ nullable: true, example: 'Senior Frontend Engineer' })
  title!: string | null;

  @ApiProperty({ nullable: true, example: 'Acme Corp' })
  company!: string | null;

  @ApiProperty({ nullable: true, example: 'Warsaw, Poland' })
  location!: string | null;

  @ApiProperty({ nullable: true, example: '2021-03' })
  startDate!: string | null;

  @ApiProperty({ nullable: true, example: '2024-01' })
  endDate!: string | null;

  @ApiProperty({ example: false })
  current!: boolean;

  @ApiProperty({ type: [String], example: ['Led migration to Angular 17'] })
  bullets!: string[];
}

export class CvEducationItemDto {
  @ApiProperty({ nullable: true, example: 'B.Sc. Computer Science' })
  degree!: string | null;

  @ApiProperty({ nullable: true, example: 'Warsaw University of Technology' })
  institution!: string | null;

  @ApiProperty({ nullable: true, example: 'Warsaw, Poland' })
  location!: string | null;

  @ApiProperty({ nullable: true, example: '2015-10' })
  startDate!: string | null;

  @ApiProperty({ nullable: true, example: '2019-06' })
  endDate!: string | null;

  @ApiProperty({ nullable: true, example: 'Computer Science' })
  field!: string | null;
}

export class CvCertificationDto {
  @ApiProperty({ example: 'AWS Certified Developer' })
  name!: string;

  @ApiProperty({ nullable: true, example: 'Amazon Web Services' })
  issuer!: string | null;

  @ApiProperty({ nullable: true, example: '2023-05' })
  date!: string | null;
}

export class CvProjectDto {
  @ApiProperty({ example: 'OptiCV' })
  name!: string;

  @ApiProperty({ nullable: true, example: 'AI-powered CV optimizer' })
  description!: string | null;

  @ApiProperty({ type: [String], example: ['Angular', 'NestJS'] })
  technologies!: string[];

  @ApiProperty({ nullable: true, example: 'https://opticv.app' })
  url!: string | null;
}

export class CvLanguageDto {
  @ApiProperty({ example: 'English' })
  language!: string;

  @ApiProperty({ nullable: true, example: 'C1' })
  proficiency!: string | null;
}

export class CvStructuredDataDto {
  @ApiProperty({ type: () => CvContactInfoDto })
  contact!: CvContactInfoDto;

  @ApiProperty({ nullable: true, example: 'Experienced software engineer...' })
  summary!: string | null;

  @ApiProperty({ type: () => [CvExperienceItemDto] })
  experience!: CvExperienceItemDto[];

  @ApiProperty({ type: () => [CvEducationItemDto] })
  education!: CvEducationItemDto[];

  @ApiProperty({ type: [String], example: ['TypeScript', 'Angular'] })
  skills!: string[];

  @ApiProperty({ type: () => [CvCertificationDto] })
  certifications!: CvCertificationDto[];

  @ApiProperty({ type: () => [CvProjectDto] })
  projects!: CvProjectDto[];

  @ApiProperty({ type: () => [CvLanguageDto] })
  languages!: CvLanguageDto[];

  @ApiProperty({ nullable: true, example: null })
  other!: string | null;

  @ApiProperty({ nullable: true, example: null })
  gdprClause!: string | null;
}

export class UploadCvResponseDto {
  @ApiProperty({ example: 'cv-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'my-cv.pdf' })
  fileName!: string;

  @ApiProperty({ example: 204800 })
  fileSize!: number;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 'users/user-id/cv-uuid-123.pdf' })
  storageKey!: string;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'COMPLETED', 'FAILED'] })
  parseStatus!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt!: string;
}

export class CvDocumentListItemDto {
  @ApiProperty({ example: 'cv-uuid-123' })
  id!: string;

  @ApiProperty({ nullable: true, example: 'my-cv.pdf' })
  fileName!: string | null;

  @ApiProperty({ nullable: true, example: 204800 })
  fileSize!: number | null;

  @ApiProperty({ nullable: true, example: 'application/pdf' })
  mimeType!: string | null;

  @ApiProperty({ nullable: true, example: 'users/user-id/cv-uuid-123.pdf' })
  storageKey!: string | null;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'COMPLETED', 'FAILED'] })
  parseStatus!: string;

  @ApiProperty({ nullable: true, example: 'Extracted CV text...' })
  parsedText!: string | null;

  @ApiProperty({
    example: 'COMPLETED',
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
  })
  extractionStatus!: string;

  @ApiProperty({ example: false })
  manuallyEdited!: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt!: string;
}

export class CvExtractResponseDto {
  @ApiProperty({ type: () => CvStructuredDataDto })
  data!: CvStructuredDataDto;
}

export class CvDocumentDto {
  @ApiProperty({ example: 'cv-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'user-uuid-123' })
  userId!: string;

  @ApiProperty({ nullable: true, example: null })
  fileName!: string | null;

  @ApiProperty({ nullable: true, example: null })
  fileSize!: number | null;

  @ApiProperty({ nullable: true, example: null })
  mimeType!: string | null;

  @ApiProperty({ nullable: true, example: null })
  storageKey!: string | null;

  @ApiProperty({
    example: 'COMPLETED',
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
  })
  parseStatus!: string;

  @ApiProperty({ type: () => CvStructuredDataDto })
  structuredData!: CvStructuredDataDto;

  @ApiProperty({
    example: 'COMPLETED',
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
  })
  extractionStatus!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: true })
  manuallyEdited!: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt!: string;
}

export class CvDownloadUrlResponseDto {
  @ApiProperty({ example: 'https://storage.example.com/signed-url' })
  url!: string;
}
