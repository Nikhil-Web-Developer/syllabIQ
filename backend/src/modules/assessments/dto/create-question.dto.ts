import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuestionOptionDto {
  @ApiProperty({ example: 'opt_1' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Coriolis force causes deflection to the right in the Northern Hemisphere' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'Which force governs the geostrophic balance in oceanic currents?' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    example: [
      { id: 'opt_1', text: 'Coriolis force and pressure gradient force' },
      { id: 'opt_2', text: 'Centrifugal force and gravitational force' },
      { id: 'opt_3', text: 'Frictional drag only' },
      { id: 'opt_4', text: 'Thermal expansion gradient' },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  options: QuestionOptionDto[];

  @ApiProperty({ example: 'opt_1' })
  @IsString()
  @IsNotEmpty()
  correctOptionId: string;

  @ApiPropertyOptional({ example: 'Geostrophic flow results when horizontal pressure gradient force balances Coriolis force.' })
  @IsString()
  @IsOptional()
  explanation?: string;
}
