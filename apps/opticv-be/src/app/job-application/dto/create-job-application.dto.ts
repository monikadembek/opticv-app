import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobApplicationDto {
  @ApiProperty({ example: 'abc-123' })
  @IsString()
  @IsNotEmpty()
  cvDocumentId!: string;

  @ApiProperty({ example: 'Senior Frontend Engineer', maxLength: 256 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  jobTitle!: string;

  @ApiProperty({ example: 'Acme Corp', maxLength: 256 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  companyName!: string;

  @ApiProperty({ example: 'We are looking for...', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  jobDescription!: string;

  @ApiPropertyOptional({ example: 'Applied via LinkedIn', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
