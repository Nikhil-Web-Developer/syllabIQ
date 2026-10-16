import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestionBankDto {
  @ApiProperty({ example: 'uuid-of-course' })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiPropertyOptional({ example: 'uuid-of-skill' })
  @IsString()
  @IsOptional()
  subjectSkillId?: string;

  @ApiProperty({ example: 'Mid-Term Assessment: Ocean Circulation & Dynamics' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: '2026-09-30T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({ example: 60, default: 60 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  passPercentage?: number;

  @ApiPropertyOptional({ example: 45, default: 30 })
  @IsInt()
  @Min(5)
  @IsOptional()
  timeLimitMinutes?: number;
}
