import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { Public } from '../decorators/public.decorator';
import { StorageService } from './storage.service';

@ApiTags('Storage & Signed URLs')
@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Public()
  @Get('files/:folder/:filename')
  @ApiOperation({ summary: 'Secure signed URL download for folder-scoped storage files' })
  getFileTwoSegments(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Query('expires') expires: string,
    @Query('sig') sig: string,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    const fileKey = `${folder}/${filename}`;
    const { filePath, mimeType } = this.storageService.getFilePathIfValid(
      fileKey,
      expires,
      sig,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    const fileStream = fs.createReadStream(filePath);
    return new StreamableFile(fileStream);
  }

  @Public()
  @Get('files/:fileKey')
  @ApiOperation({ summary: 'Secure signed URL download for private storage files' })
  getFile(
    @Param('fileKey') fileKey: string,
    @Query('expires') expires: string,
    @Query('sig') sig: string,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    const key = decodeURIComponent(fileKey);
    const { filePath, mimeType } = this.storageService.getFilePathIfValid(
      key,
      expires,
      sig,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
    });

    const fileStream = fs.createReadStream(filePath);
    return new StreamableFile(fileStream);
  }
}
