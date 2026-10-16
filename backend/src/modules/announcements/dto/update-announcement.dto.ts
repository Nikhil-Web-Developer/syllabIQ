import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementType } from './create-announcement.dto';

export class UpdateAnnouncementDto {
  @ApiPropertyOptional({ example: 'Updated Announcement Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated announcement content...' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ enum: AnnouncementType })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;
}
