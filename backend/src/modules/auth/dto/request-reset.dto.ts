import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestResetDto {
  @ApiProperty({ example: 'manav@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
