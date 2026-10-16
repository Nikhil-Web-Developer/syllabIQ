import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTraineeProfileDto {
  @ApiPropertyOptional({ example: 'Dr. Rajesh Sharma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Atmospheric scientist specializing in tropical meteorology and disaster mitigation.',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'Marine Observations' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 'Scientific Assistant' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({
    example: [
      { degree: 'Ph.D. in Atmospheric Sciences', institution: 'IIT Delhi', year: 2022 },
      { degree: 'M.Sc. in Meteorology', institution: 'Cochin University', year: 2018 },
    ],
  })
  @IsOptional()
  @IsArray()
  qualifications?: Array<{ degree: string; institution?: string; institute?: string; year?: number | string }>;

  @ApiPropertyOptional({
    example: [
      {
        role: 'Research Fellow',
        organization: 'Indian Institute of Tropical Meteorology (IITM)',
        duration: '2022 - Present',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  work_experience?: Array<{ role: string; organization: string; duration?: string; description?: string }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  workExperience?: Array<{ role: string; organization: string; duration?: string; description?: string }>;

  @ApiPropertyOptional({
    example: ['Numerical Weather Prediction', 'Monsoon Dynamics', 'GIS Remote Sensing'],
  })
  @IsOptional()
  @IsArray()
  interests?: string[];
}
