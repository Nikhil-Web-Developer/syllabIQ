import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadCertificateDto {
  @ApiProperty({ example: 'Certificate in Doppler Weather Radar Diagnostics' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'India Meteorological Department (IMD)' })
  @IsString()
  @IsNotEmpty()
  issuing_body: string;

  @ApiProperty({ example: '2026-05-15' })
  @IsDateString()
  @IsNotEmpty()
  issue_date: string;

  @ApiPropertyOptional({ example: 'uuid-of-course' })
  @IsOptional()
  @IsUUID()
  course_id?: string;
}
