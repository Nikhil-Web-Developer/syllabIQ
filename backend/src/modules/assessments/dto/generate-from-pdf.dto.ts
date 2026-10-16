import { IsOptional, IsString, IsUUID, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateFromPdfDto {
  @ApiPropertyOptional({ description: 'Existing Question Bank ID if adding to one' })
  @IsOptional()
  @IsUUID()
  questionBankId?: string;

  @ApiPropertyOptional({ description: 'Course ID to attach new question bank to' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Title of the Question Bank if creating a new one' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Target number of MCQs to generate (10-15)', default: 12 })
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: 'Suggested difficulty level', enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' })
  @IsOptional()
  @IsString()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  difficulty?: string;
}
