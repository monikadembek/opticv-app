import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SupabaseGuard } from '../auth/supabase.guard';
import type { UserModel } from '../../generated/prisma/models.js';
import { CvService } from './cv.service';
import { CvExtractionService } from './services/cv-extraction.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type {
  CvDocumentListItem,
  CvStructuredData,
  UploadCvResponse,
} from '@opticv/datatypes';
import {
  CvDocumentListItemDto,
  CvDownloadUrlResponseDto,
  CvExtractResponseDto,
  UploadCvResponseDto,
} from './dto/cv-response.dto';

@ApiTags('cv')
@ApiBearerAuth()
@Controller('cv')
@UseGuards(SupabaseGuard)
export class CvController {
  constructor(
    private readonly cvService: CvService,
    private readonly cvExtractionService: CvExtractionService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Upload a CV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: UploadCvResponseDto, description: 'CV uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  uploadCv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserModel,
  ): Promise<UploadCvResponse> {
    return this.cvService.uploadCv(file, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all CVs for the current user' })
  @ApiResponse({ status: 200, type: [CvDocumentListItemDto], description: 'List of CV documents' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserCvs(@CurrentUser() user: UserModel): Promise<CvDocumentListItem[]> {
    return this.cvService.getUserCvs(user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get a signed download URL for a CV' })
  @ApiResponse({ status: 200, type: CvDownloadUrlResponseDto, description: 'Signed download URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'CV not found' })
  getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<{ url: string }> {
    return this.cvService.getDownloadUrl(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a CV document' })
  @ApiResponse({ status: 204, description: 'CV deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'CV not found' })
  deleteCv(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<void> {
    return this.cvService.deleteCv(id, user.id);
  }

  @Post(':id/extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extract structured data from a CV' })
  @ApiResponse({ status: 200, type: CvExtractResponseDto, description: 'Extracted CV data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'CV not found' })
  async extractCv(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<{ data: CvStructuredData }> {
    const data = await this.cvExtractionService.extractStructuredData(
      id,
      user.id,
    );
    return { data };
  }
}
