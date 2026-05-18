import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobApplicationDto {
  @ApiPropertyOptional({ example: 'abc-123' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cvDocumentId?: string;

  @ApiPropertyOptional({ example: 'Lead Engineer', maxLength: 256 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(256)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Globex', maxLength: 256 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(256)
  companyName?: string;

  @ApiPropertyOptional({ example: 'Updated description...', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(5000)
  jobDescription?: string;

  @ApiPropertyOptional({ example: null, nullable: true, maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string | null;
}
