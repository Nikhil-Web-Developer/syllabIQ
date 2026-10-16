import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ResourceType {
  VIDEO = 'video',
  PDF = 'pdf',
  PPT = 'ppt',
  DOC = 'doc',
  LINK = 'link',
}

export class UploadResourceDto {
  @ApiProperty({ example: 'Module 1: WRF Model Formulation & Grids' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: ResourceType, default: ResourceType.PDF })
  @IsEnum(ResourceType)
  @IsNotEmpty()
  type: ResourceType;

  @ApiPropertyOptional({ example: 'https://www.incois.gov.in/portal/ocean_models.jsp' })
  @IsString()
  @IsOptional()
  link_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  file_url?: string;
}
