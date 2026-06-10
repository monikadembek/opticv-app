import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SupabaseGuard } from '../auth/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserModel } from '../../generated/prisma/models.js';
import type { JobApplicationListResponse, JobApplicationResponse, JobApplicationWithCv } from '@opticv/datatypes';
import { JobApplicationService } from './job-application.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { UpdateAtsScoreDto } from './dto/update-ats-score.dto';
import { JobApplicationQueryDto } from './dto/job-application-query.dto';
import {
  JobApplicationListResponseDto,
  JobApplicationResponseDto,
} from './dto/job-application-response.dto';

@ApiTags('job-applications')
@ApiBearerAuth()
@Controller('job-applications')
@UseGuards(SupabaseGuard)
export class JobApplicationController {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a job application' })
  @ApiResponse({ status: 201, type: JobApplicationResponseDto, description: 'Job application created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() dto: CreateJobApplicationDto,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationResponse> {
    return this.jobApplicationService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List job applications with pagination' })
  @ApiResponse({ status: 200, type: JobApplicationListResponseDto, description: 'Paginated list of job applications' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Query() query: JobApplicationQueryDto,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationListResponse> {
    return this.jobApplicationService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single job application' })
  @ApiResponse({ status: 200, type: JobApplicationResponseDto, description: 'Job application details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job application not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationWithCv> {
    return this.jobApplicationService.findOne(id, user.id);
  }

  @Patch(':id/ats-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update ATS score for a job application' })
  @ApiResponse({ status: 200, type: JobApplicationResponseDto, description: 'ATS score updated' })
  @ApiResponse({ status: 400, description: 'Invalid score' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job application not found' })
  updateAtsScore(
    @Param('id') id: string,
    @Body() dto: UpdateAtsScoreDto,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationResponse> {
    return this.jobApplicationService.updateAtsScore(id, dto, user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a job application' })
  @ApiResponse({ status: 200, type: JobApplicationResponseDto, description: 'Job application updated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job application not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJobApplicationDto,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationResponse> {
    return this.jobApplicationService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a job application' })
  @ApiResponse({ status: 204, description: 'Job application deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job application not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<void> {
    return this.jobApplicationService.remove(id, user.id);
  }
}
