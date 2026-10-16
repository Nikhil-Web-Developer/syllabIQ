import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class EnrollCourseDto {
  @ApiPropertyOptional({ description: 'Course UUID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Course UUID (snake_case alias)' })
  @IsOptional()
  @IsUUID()
  course_id?: string;
}
