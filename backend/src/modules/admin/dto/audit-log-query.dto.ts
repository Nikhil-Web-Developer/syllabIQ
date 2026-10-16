import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ example: 'approved_user', description: 'Filter by action type' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'admin@syllabiq.gov.in', description: 'Filter by actor name or email' })
  @IsOptional()
  @IsString()
  actor?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z', description: 'Start date filter' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z', description: 'End date filter' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number = 0;
}
