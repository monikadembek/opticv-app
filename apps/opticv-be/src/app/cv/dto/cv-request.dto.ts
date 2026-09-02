import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CvContactInfoRequestDto {
  @ApiProperty({ nullable: true, example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  name!: string | null;

  @ApiProperty({ nullable: true, example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  position!: string | null;

  @ApiProperty({ nullable: true, example: 'jane@example.com' })
  @IsOptional()
  @IsString()
  email!: string | null;

  @ApiProperty({ nullable: true, example: '+48 123 456 789' })
  @IsOptional()
  @IsString()
  phone!: string | null;

  @ApiProperty({ nullable: true, example: 'Warsaw, Poland' })
  @IsOptional()
  @IsString()
  location!: string | null;

  @ApiProperty({ nullable: true, example: 'https://linkedin.com/in/janedoe' })
  @IsOptional()
  @IsString()
  linkedin!: string | null;

  @ApiProperty({ nullable: true, example: 'https://janedoe.dev' })
  @IsOptional()
  @IsString()
  website!: string | null;
}

export class CvExperienceItemRequestDto {
  @ApiProperty({ nullable: true, example: 'Senior Frontend Engineer' })
  @IsOptional()
  @IsString()
  title!: string | null;

  @ApiProperty({ nullable: true, example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  company!: string | null;

  @ApiProperty({ nullable: true, example: 'Warsaw, Poland' })
  @IsOptional()
  @IsString()
  location!: string | null;

  @ApiProperty({ nullable: true, example: '2021-03' })
  @IsOptional()
  @IsString()
  startDate!: string | null;

  @ApiProperty({ nullable: true, example: '2024-01' })
  @IsOptional()
  @IsString()
  endDate!: string | null;

  @ApiProperty({ example: false })
  @IsBoolean()
  current!: boolean;

  @ApiProperty({ type: [String], example: ['Led migration to Angular 17'] })
  @IsArray()
  @IsString({ each: true })
  bullets!: string[];
}

export class CvEducationItemRequestDto {
  @ApiProperty({ nullable: true, example: 'B.Sc. Computer Science' })
  @IsOptional()
  @IsString()
  degree!: string | null;

  @ApiProperty({ nullable: true, example: 'Warsaw University of Technology' })
  @IsOptional()
  @IsString()
  institution!: string | null;

  @ApiProperty({ nullable: true, example: 'Warsaw, Poland' })
  @IsOptional()
  @IsString()
  location!: string | null;

  @ApiProperty({ nullable: true, example: '2015-10' })
  @IsOptional()
  @IsString()
  startDate!: string | null;

  @ApiProperty({ nullable: true, example: '2019-06' })
  @IsOptional()
  @IsString()
  endDate!: string | null;

  @ApiProperty({ nullable: true, example: 'Computer Science' })
  @IsOptional()
  @IsString()
  field!: string | null;
}

export class CvCertificationRequestDto {
  @ApiProperty({ example: 'AWS Certified Developer' })
  @IsString()
  name!: string;

  @ApiProperty({ nullable: true, example: 'Amazon Web Services' })
  @IsOptional()
  @IsString()
  issuer!: string | null;

  @ApiProperty({ nullable: true, example: '2023-05' })
  @IsOptional()
  @IsString()
  date!: string | null;
}

export class CvProjectRequestDto {
  @ApiProperty({ example: 'OptiCV' })
  @IsString()
  name!: string;

  @ApiProperty({ nullable: true, example: 'AI-powered CV optimizer' })
  @IsOptional()
  @IsString()
  description!: string | null;

  @ApiProperty({ type: [String], example: ['Angular', 'NestJS'] })
  @IsArray()
  @IsString({ each: true })
  technologies!: string[];

  @ApiProperty({ nullable: true, example: 'https://opticv.app' })
  @IsOptional()
  @IsString()
  url!: string | null;
}

export class CvLanguageRequestDto {
  @ApiProperty({ example: 'English' })
  @IsString()
  language!: string;

  @ApiProperty({ nullable: true, example: 'C1' })
  @IsOptional()
  @IsString()
  proficiency!: string | null;
}

export class CvStructuredDataRequestDto {
  @ApiProperty({ type: () => CvContactInfoRequestDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CvContactInfoRequestDto)
  contact!: CvContactInfoRequestDto;

  @ApiProperty({ nullable: true, example: 'Experienced software engineer...' })
  @IsOptional()
  @IsString()
  summary!: string | null;

  @ApiProperty({ type: () => [CvExperienceItemRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvExperienceItemRequestDto)
  experience!: CvExperienceItemRequestDto[];

  @ApiProperty({ type: () => [CvEducationItemRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvEducationItemRequestDto)
  education!: CvEducationItemRequestDto[];

  @ApiProperty({ type: [String], example: ['TypeScript', 'Angular'] })
  @IsArray()
  @IsString({ each: true })
  skills!: string[];

  @ApiProperty({ type: () => [CvCertificationRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvCertificationRequestDto)
  certifications!: CvCertificationRequestDto[];

  @ApiProperty({ type: () => [CvProjectRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvProjectRequestDto)
  projects!: CvProjectRequestDto[];

  @ApiProperty({ type: () => [CvLanguageRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvLanguageRequestDto)
  languages!: CvLanguageRequestDto[];

  @ApiProperty({ nullable: true, example: null })
  @IsOptional()
  @IsString()
  other!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @IsOptional()
  @IsString()
  gdprClause!: string | null;
}
