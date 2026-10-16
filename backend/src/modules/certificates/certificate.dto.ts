import { IsUUID, IsString, IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateCertificateDto {
  @ApiProperty({ description: 'Assessment attempt ID' })
  @IsUUID()
  assessmentAttemptId: string;

  @ApiPropertyOptional({ description: 'Optional custom certificate title' })
  @IsString()
  @IsOptional()
  customTitle?: string;
}

export class CertificateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Student/Trainee name' })
  traineeName: string;

  @ApiProperty({ description: 'Course name' })
  courseName: string;

  @ApiProperty({ description: 'Trainer/Teacher name' })
  trainerName: string;

  @ApiProperty({ description: 'Certificate title' })
  title: string;

  @ApiProperty({ description: 'Issuing body' })
  issuingBody: string;

  @ApiProperty({ description: 'Issue date' })
  issueDate: string;

  @ApiProperty({ description: 'Score achieved' })
  score: number;

  @ApiProperty({ description: 'Unique certificate code for verification' })
  certificateCode: string;

  @ApiProperty({ description: 'Verification code (legacy)' })
  verificationCode?: string;

  @ApiPropertyOptional({ description: 'PDF file URL' })
  pdfFileUrl?: string;

  @ApiPropertyOptional({ description: 'Certificate expiration date' })
  expiresAt?: string;

  @ApiProperty({ description: 'Is revoked' })
  isRevoked: boolean;

  @ApiPropertyOptional({ description: 'Revocation reason' })
  revocationReason?: string;

  @ApiProperty({ description: 'Certificate created date' })
  createdAt: string;
}

export class CertificateListResponseDto {
  @ApiProperty({ type: [CertificateResponseDto] })
  certificates: CertificateResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}

export class RevokeCertificateDto {
  @ApiProperty({ description: 'Reason for revocation' })
  @IsString()
  reason: string;
}

export class CreateShareLinkDto {
  @ApiPropertyOptional({ description: 'Whether to make shareable link public' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Expiration date for the share link' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class ShareLinkResponseDto {
  @ApiProperty({ description: 'Share token' })
  shareToken: string;

  @ApiProperty({ description: 'Shareable URL' })
  shareUrl: string;

  @ApiProperty({ description: 'Is public' })
  isPublic: boolean;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expiresAt?: string;

  @ApiProperty({ description: 'Created date' })
  createdAt: string;
}
