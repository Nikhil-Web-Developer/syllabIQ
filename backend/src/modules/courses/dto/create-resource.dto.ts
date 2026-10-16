import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ResourceType {
  VIDEO = 'video',
  PDF = 'pdf',
  PPT = 'ppt',
  DOC = 'doc',
  LINK = 'link',
}

export class CreateResourceDto {
  @ApiProperty({ example: 'Lecture 1: Dynamic Meteorology Fundamentals' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: ResourceType, example: ResourceType.PDF })
  @IsEnum(ResourceType)
  type: ResourceType;

  @ApiProperty({ example: 'https://storage.syllabiq.gov.in/docs/lecture1.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}
