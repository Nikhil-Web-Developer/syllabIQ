import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class AiGenerateQuestionsDto {
  @ApiProperty({
    example:
      'Numerical Weather Prediction (NWP) uses mathematical models of the atmosphere and oceans to predict the weather based on current weather conditions. S-band Doppler radar operates in the 2-4 GHz microwave frequency range.',
    description: 'Lecture notes, syllabus content, transcript, or topic summary to generate questions from',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 3, default: 3, description: 'Number of candidate questions to generate (1-10)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;

  @ApiPropertyOptional({ example: 'intermediate', enum: ['beginner', 'intermediate', 'advanced'] })
  @IsOptional()
  @IsString()
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}
