import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ example: 75, description: 'Course progress percentage (0 to 100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  progress_percent: number;
}
