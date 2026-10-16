import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Dr. Anita Sharma' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Senior Scientist in Ocean Modeling' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsInt()
  @Min(0)
  @IsOptional()
  yearsExperience?: number;

  @ApiPropertyOptional({ example: [{ degree: 'Ph.D. Marine Geology', institute: 'IIT Bombay', year: 2018 }] })
  @IsArray()
  @IsOptional()
  qualifications?: any[];

  @ApiPropertyOptional({ example: [{ role: 'Lead Oceanographer', org: 'INCOIS', years: 5 }] })
  @IsArray()
  @IsOptional()
  workExperience?: any[];

  @ApiPropertyOptional({ example: ['Atmospheric Physics', 'Tsunami Warning Systems', 'Python Data Analysis'] })
  @IsArray()
  @IsOptional()
  interests?: string[];
}
