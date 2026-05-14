import {
  Controller,
  HttpCode,
  HttpStatus,
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
import type { UploadCvResponse } from '@opticv/datatypes';

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
}
