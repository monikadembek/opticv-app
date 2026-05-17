import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJobApplicationDto {
  @IsString()
  @IsNotEmpty()
  cvDocumentId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  jobTitle!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  jobDescription!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
