import { ApiProperty } from '@nestjs/swagger';

export class JobApplicationResponseDto {
  @ApiProperty({ example: 'app-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'user-uuid-456' })
  userId!: string;

  @ApiProperty({ example: 'cv-uuid-789' })
  cvDocumentId!: string;

  @ApiProperty({ nullable: true, example: 'Senior Frontend Engineer' })
  jobTitle!: string | null;

  @ApiProperty({ nullable: true, example: 'Acme Corp' })
  companyName!: string | null;

  @ApiProperty({ example: 'We are looking for an experienced engineer...' })
  jobDescription!: string;

  @ApiProperty({ nullable: true, example: 82 })
  atsScore!: number | null;

  @ApiProperty({ nullable: true, example: 'Applied via LinkedIn' })
  notes!: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-20T14:00:00.000Z' })
  updatedAt!: string;
}

export class JobApplicationListItemDto {
  @ApiProperty({ example: 'app-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'user-uuid-456' })
  userId!: string;

  @ApiProperty({ example: 'cv-uuid-789' })
  cvDocumentId!: string;

  @ApiProperty({ nullable: true, example: 'Senior Frontend Engineer' })
  jobTitle!: string | null;

  @ApiProperty({ nullable: true, example: 'Acme Corp' })
  companyName!: string | null;

  @ApiProperty({ nullable: true, example: 82 })
  atsScore!: number | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-20T14:00:00.000Z' })
  updatedAt!: string;
}

export class JobApplicationListResponseDto {
  @ApiProperty({ type: () => [JobApplicationListItemDto] })
  data!: JobApplicationListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;
}
