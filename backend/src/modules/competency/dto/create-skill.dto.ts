import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkillDto {
  @ApiProperty({ example: 'Ocean Acoustic Tomography' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Domain' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
