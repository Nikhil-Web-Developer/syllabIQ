import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CourseDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class CreateCourseDto {
  @ApiProperty({ example: 'Advanced Numerical Weather Prediction & Climate Modeling' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Comprehensive training module covering WRF models and ocean-atmosphere coupling.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-of-skill' })
  @IsUUID()
  @IsOptional()
  subjectSkillId?: string;

  @ApiProperty({ enum: CourseDifficulty, default: CourseDifficulty.BEGINNER })
  @IsEnum(CourseDifficulty)
  @IsOptional()
  difficulty?: CourseDifficulty;

  @ApiProperty({ enum: CourseStatus, default: CourseStatus.DRAFT })
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;
}
