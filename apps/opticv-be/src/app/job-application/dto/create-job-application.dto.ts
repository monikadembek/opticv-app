import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJobApplicationDto {
  @IsString()
  @IsNotEmpty()
  cvDocumentId!: string;

  @IsString()
  @IsNotEmpty()
  jobTitle!: string;

  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  jobDescription!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
