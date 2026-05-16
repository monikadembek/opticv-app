import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateJobApplicationDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cvDocumentId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  jobTitle?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  jobDescription?: string;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
