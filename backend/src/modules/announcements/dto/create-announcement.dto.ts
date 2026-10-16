import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AnnouncementType {
  ANNOUNCEMENT = 'announcement',
  ACHIEVEMENT = 'achievement',
  NEW_CONTENT = 'new_content',
}

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'MoES National Workshop on Deep Ocean Mission' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Registration is now open for all ministry trainees and scientific officers.' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ enum: AnnouncementType, default: AnnouncementType.ANNOUNCEMENT })
  @IsEnum(AnnouncementType)
  type: AnnouncementType;
}
