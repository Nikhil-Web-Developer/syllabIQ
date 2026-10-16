import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z', description: 'Start date filter (ISO string)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z', description: 'End date filter (ISO string)' })
  @IsOptional()
  @IsString()
  to?: string;
}
