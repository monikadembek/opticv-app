import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JobApplicationListResponse, JobApplicationResponse, JobApplicationWithCv } from '@opticv/datatypes';
import type { CreateJobApplicationDto } from './dto/create-job-application.dto';
import type { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import type { UpdateAtsScoreDto } from './dto/update-ats-score.dto';
import type { JobApplicationQueryDto } from './dto/job-application-query.dto';

@Injectable()
export class JobApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCvOwnership(cvDocumentId: string, userId: string): Promise<void> {
    const cv = await this.prisma.cvDocument.findUnique({ where: { id: cvDocumentId } });
    if (!cv || cv.userId !== userId) {
      throw new NotFoundException('CV document not found.');
    }
  }

  async create(dto: CreateJobApplicationDto, userId: string): Promise<JobApplicationResponse> {
    await this.assertCvOwnership(dto.cvDocumentId, userId);
    return this.prisma.jobApplication.create({ data: { ...dto, userId } });
  }

  async findAll(userId: string, query: JobApplicationQueryDto): Promise<JobApplicationListResponse> {
    const paginationArgs = {
      ...(query.limit !== undefined && { take: query.limit }),
      ...(query.offset !== undefined && { skip: query.offset }),
    };

    const [total, data] = await Promise.all([
      this.prisma.jobApplication.count({ where: { userId } }),
      this.prisma.jobApplication.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          cvDocumentId: true,
          jobTitle: true,
          companyName: true,
          atsScore: true,
          createdAt: true,
          updatedAt: true,
          cvDocument: { select: { id: true, fileName: true } },
        },
        ...paginationArgs,
      }),
    ]);

    return { data, total };
  }

  async findOne(id: string, userId: string): Promise<JobApplicationWithCv> {
    const record = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { cvDocument: { select: { id: true, fileName: true } } },
    });
    if (!record || record.userId !== userId) {
      throw new NotFoundException('Job application not found.');
    }
    return record as JobApplicationWithCv;
  }

  async update(id: string, dto: UpdateJobApplicationDto, userId: string): Promise<JobApplicationResponse> {
    await this.findOne(id, userId);
    if (dto.cvDocumentId) {
      await this.assertCvOwnership(dto.cvDocumentId, userId);
    }
    return this.prisma.jobApplication.update({ where: { id }, data: dto });
  }

  async updateAtsScore(id: string, dto: UpdateAtsScoreDto, userId: string): Promise<JobApplicationResponse> {
    await this.findOne(id, userId);
    return this.prisma.jobApplication.update({ where: { id }, data: { atsScore: dto.atsScore } });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.jobApplication.delete({ where: { id } });
  }
}
