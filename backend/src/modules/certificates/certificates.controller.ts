import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { CertificatesService } from './certificates.service';
import {
  CertificateResponseDto,
  RevokeCertificateDto,
  CreateShareLinkDto,
  ShareLinkResponseDto,
} from './certificate.dto';

@ApiTags('Certificates')
@Controller('api/certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  /**
   * Get certificate by ID
   * Trainee: own certs only, Trainer: certs from their courses, Admin: all
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRAINEE, UserRole.TRAINER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get certificate details',
    description: 'Retrieve full certificate details (accessible to owner, trainer, or admin)',
  })
  async getCertificate(
    @Param('id', new ParseUUIDPipe()) certificateId: string,
    @CurrentUser() user: any,
  ): Promise<CertificateResponseDto> {
    return this.certificatesService.getCertificateById(certificateId, user.id, user.role);
  }

  /**
   * Get current user's certificates (paginated)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRAINEE, UserRole.TRAINER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List user certificates',
    description: 'Get paginated list of certificates (own for trainee/trainer, all for admin)',
  })
  async listUserCertificates(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.certificatesService.getUserCertificates(user.id, user.role, page, limit);
  }

  /**
   * Download certificate PDF
   */
  @Get(':id/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRAINEE, UserRole.TRAINER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download certificate PDF',
    description: 'Download certificate as PDF file',
  })
  async downloadCertificate(
    @Param('id', new ParseUUIDPipe()) certificateId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.certificatesService.downloadCertificatePdf(certificateId, user.id, user.role);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="certificate.pdf"');
      res.send(buffer);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create shareable link for certificate
   */
  @Post(':id/share')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRAINEE, UserRole.TRAINER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create shareable link',
    description: 'Generate a shareable link for this certificate',
  })
  async createShareLink(
    @Param('id', new ParseUUIDPipe()) certificateId: string,
    @Body() dto: CreateShareLinkDto,
    @CurrentUser() user: any,
  ): Promise<ShareLinkResponseDto> {
    return this.certificatesService.createShareLink(certificateId, user.id, user.role, dto);
  }

  /**
   * Get certificate by share token (public)
   */
  @Get('share/:token')
  @Public()
  @ApiOperation({
    summary: 'View shared certificate',
    description: 'View a certificate by shareable link token',
  })
  async getSharedCertificate(
    @Param('token') shareToken: string,
  ): Promise<CertificateResponseDto> {
    return this.certificatesService.getCertificateByShareToken(shareToken);
  }

  /**
   * Revoke certificate (Trainer/Admin only)
   */
  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke certificate',
    description: 'Revoke a certificate with a reason (trainer/admin only)',
  })
  async revokeCertificate(
    @Param('id', new ParseUUIDPipe()) certificateId: string,
    @Body() dto: RevokeCertificateDto,
    @CurrentUser() user: any,
  ) {
    return this.certificatesService.revokeCertificate(certificateId, user.id, user.role, dto);
  }

  /**
   * Verify certificate authenticity (public endpoint)
   */
  @Get('verify/:code')
  @Public()
  @ApiOperation({
    summary: 'Verify certificate authenticity',
    description: 'Public endpoint to verify a certificate by code',
  })
  async verifyCertificate(@Param('code') code: string) {
    return this.certificatesService.verifyCertificate(code);
  }

  /**
   * Get certificate statistics (Admin only)
   */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Certificate statistics',
    description: 'Get certificate issuance statistics (admin only)',
  })
  async getCertificateStats() {
    return this.certificatesService.getCertificateStats();
  }
}
