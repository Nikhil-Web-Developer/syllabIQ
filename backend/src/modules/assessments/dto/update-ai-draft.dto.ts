import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAiDraftOptionDto {
  @IsString()
  id: string;

  @IsString()
  text: string;
}

export class UpdateAiDraftDto {
  @ApiPropertyOptional({ description: 'Question text' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'List of 4 candidate options', type: [UpdateAiDraftOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAiDraftOptionDto)
  options?: UpdateAiDraftOptionDto[];

  @ApiPropertyOptional({ description: 'Option ID of the correct answer' })
  @IsOptional()
  @IsString()
  correctOptionId?: string;

  @ApiPropertyOptional({ description: 'Explanation citing the source document' })
  @IsOptional()
  @IsString()
  explanation?: string;
}
