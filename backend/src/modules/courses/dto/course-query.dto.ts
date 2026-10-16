import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDifficulty, CourseStatus } from './create-course.dto';

export class CourseQueryDto {
  @ApiPropertyOptional({ description: 'Search term for course title or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Skill category or skill name' })
  @IsString()
  @IsOptional()
  skill?: string;

  @ApiPropertyOptional({ description: 'Specific skill UUID' })
  @IsString()
  @IsOptional()
  subject_skill_id?: string;

  @ApiPropertyOptional({ enum: CourseDifficulty })
  @IsEnum(CourseDifficulty)
  @IsOptional()
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ description: 'Filter by trainer ID or "me"' })
  @IsString()
  @IsOptional()
  trainer?: string;

  @ApiPropertyOptional({ description: 'Filter by trainer ID' })
  @IsString()
  @IsOptional()
  trainer_id?: string;

  @ApiPropertyOptional({ enum: CourseStatus })
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;
}
