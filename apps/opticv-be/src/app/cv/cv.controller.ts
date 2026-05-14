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
import { SupabaseGuard } from '../auth/supabase.guard';
import type { UserModel } from '../../generated/prisma/models.js';
import { CvService } from './cv.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CvDocumentListItem, UploadCvResponse } from '@opticv/datatypes';

@Controller('cv')
@UseGuards(SupabaseGuard)
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadCv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserModel,
  ): Promise<UploadCvResponse> {
    return this.cvService.uploadCv(file, user.id);
  }

  @Get()
  getUserCvs(
    @CurrentUser() user: UserModel,
  ): Promise<CvDocumentListItem[]> {
    return this.cvService.getUserCvs(user.id);
  }

  @Get(':id/download')
  getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<{ url: string }> {
    return this.cvService.getDownloadUrl(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCv(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<void> {
    return this.cvService.deleteCv(id, user.id);
  }
}
