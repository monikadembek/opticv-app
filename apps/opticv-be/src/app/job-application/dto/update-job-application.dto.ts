import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateJobApplicationDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cvDocumentId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(256)
  jobTitle?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(256)
  companyName?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(5000)
  jobDescription?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string | null;
}
