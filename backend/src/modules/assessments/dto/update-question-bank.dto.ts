import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpdateQuestionBankDto {
  @ApiPropertyOptional({ description: 'Question bank title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Assessment submission deadline' })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Passing threshold percentage (0-100)', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passPercentage?: number;

  @ApiPropertyOptional({ description: 'Time limit in minutes', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  timeLimitMinutes?: number;

  @ApiPropertyOptional({ description: 'Subject skill taxonomy ID' })
  @IsOptional()
  @IsString()
  subjectSkillId?: string;
}
