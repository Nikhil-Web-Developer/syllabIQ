import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum SkillSource {
  SELF_DECLARED = 'self_declared',
  CERTIFIED = 'certified',
  ASSESSED = 'assessed',
}

export class AssignUserSkillDto {
  @ApiProperty({ example: 'uuid-of-skill' })
  @IsUUID()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ enum: ProficiencyLevel, default: ProficiencyLevel.INTERMEDIATE })
  @IsEnum(ProficiencyLevel)
  @IsNotEmpty()
  proficiencyLevel: ProficiencyLevel;

  @ApiPropertyOptional({ enum: SkillSource, default: SkillSource.SELF_DECLARED })
  @IsEnum(SkillSource)
  @IsOptional()
  source?: SkillSource;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  yearsExperience?: number;
}
