import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/role.enum';

export class SignupDto {
  @ApiProperty({ example: 'Manav Biranware' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'manav@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: [UserRole.TRAINEE, UserRole.TRAINER], default: UserRole.TRAINEE })
  @IsEnum([UserRole.TRAINEE, UserRole.TRAINER], {
    message: 'Role at signup must be either trainee or trainer (admin accounts cannot be self-registered)',
  })
  role: UserRole;

  @ApiPropertyOptional({ example: 'Experienced meteorologist and ocean data analyst' })
  @IsString()
  @IsOptional()
  bio?: string;
}
