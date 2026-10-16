import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Long-lived refresh token (optional if set in httpOnly cookie)' })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
