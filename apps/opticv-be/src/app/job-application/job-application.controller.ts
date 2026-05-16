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
import { SupabaseGuard } from '../auth/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserModel } from '../../generated/prisma/models.js';
import type { JobApplicationListResponse, JobApplicationResponse } from '@opticv/datatypes';
import { JobApplicationService } from './job-application.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { UpdateAtsScoreDto } from './dto/update-ats-score.dto';
import { JobApplicationQueryDto } from './dto/job-application-query.dto';

@Controller('job-applications')
@UseGuards(SupabaseGuard)
export class JobApplicationController {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateJobApplicationDto,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationResponse> {
    return this.jobApplicationService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Query() query: JobApplicationQueryDto,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationListResponse> {
    return this.jobApplicationService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationResponse> {
    return this.jobApplicationService.findOne(id, user.id);
  }

  @Patch(':id/ats-score')
  @HttpCode(HttpStatus.OK)
  updateAtsScore(
    @Param('id') id: string,
    @Body() dto: UpdateAtsScoreDto,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationResponse> {
    return this.jobApplicationService.updateAtsScore(id, dto, user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJobApplicationDto,
    @CurrentUser() user: UserModel,
  ): Promise<JobApplicationResponse> {
    return this.jobApplicationService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<void> {
    return this.jobApplicationService.remove(id, user.id);
  }
}
