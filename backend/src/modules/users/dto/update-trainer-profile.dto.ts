import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateTrainerProfileDto {
  @ApiPropertyOptional({ example: 'Prof. Ananya Sen' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Senior Oceanographer and lead instructor for Coastal Hazard Warning Systems.',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  years_experience?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({
    example: [
      { degree: 'Ph.D. in Physical Oceanography', institution: 'Goa University', year: 2012 },
    ],
  })
  @IsOptional()
  @IsArray()
  qualifications?: Array<{ degree: string; institution?: string; institute?: string; year?: number | string }>;
}
