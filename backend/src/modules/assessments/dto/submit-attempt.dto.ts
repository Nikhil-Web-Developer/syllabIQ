import { IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAttemptDto {
  @ApiProperty({
    example: {
      'uuid-question-1': 'opt_1',
      'uuid-question-2': 'opt_3',
    },
    description: 'Map of question ID to selected option ID',
  })
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, string>;
}
