import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../../common/storage/storage.service';
import { CertificatePdfGeneratorService } from './pdf-generator.service';
import { UserRole } from '../../common/enums/role.enum';
import {
  CertificateResponseDto,
  RevokeCertificateDto,
  CreateShareLinkDto,
  ShareLinkResponseDto,
} from './certificate.dto';

@Injectable()
export class CertificatesService {
  constructor(
    private db: DatabaseService,
    private storageService: StorageService,
    private pdfGenerator: CertificatePdfGeneratorService,
  ) {}

  /**
   * Generate certificate when assessment is passed
   * Called from AssessmentsService.submitAttempt
   */
  async generateCertificateForPassing(
    traineeId: string,
    attemptId: string,
    courseId: string,
    score: number,
  ): Promise<any> {
    // Fetch attempt details
    const attemptRes = await this.db.query(
      `SELECT a.id, a.question_bank_id, a.trainee_id, a.score,
              qb.course_id, qb.title as qb_title,
              c.title as course_title, c.trainer_id,
              u_trainee.name as trainee_name,
              u_trainer.name as trainer_name
       FROM assessment_attempts a
       JOIN question_banks qb ON a.question_bank_id = qb.id
       JOIN courses c ON qb.course_id = c.id
       JOIN users u_trainee ON a.trainee_id = u_trainee.id
       JOIN users u_trainer ON c.trainer_id = u_trainer.id
       WHERE a.id = $1`,
      [attemptId],
    );

    if (attemptRes.rows.length === 0) {
      throw new NotFoundException('Assessment attempt not found');
    }

    const attempt = attemptRes.rows[0];

    // Generate unique certificate code
    const certificateCode = this.generateCertificateCode();

    // Prepare certificate data
    const certificateData = {
      traineeName: attempt.trainee_name,
      courseName: attempt.course_title || attempt.qb_title,
      trainerName: attempt.trainer_name,
      issueDate: new Date(),
      certificateCode,
      score,
      issuingBody: 'Ministry of Earth Sciences (MoES)',
    };

    // Generate PDF
    const pdfBuffer = await this.pdfGenerator.generateCertificatePdf(certificateData);

    // Save PDF to storage
    const pdfFileName = `certificates/${traineeId}/${certificateCode}.pdf`;
    const pdfFileUrl = await this.storageService.uploadBuffer(pdfBuffer, pdfFileName);

    // Create certificate record
    const certRes = await this.db.query(
      `INSERT INTO certificates (
        user_id, trainer_id, course_id, question_bank_id, assessment_attempt_id,
        title, issuing_body, issue_date, score, certificate_code,
        verification_code, pdf_file_url
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11)
       RETURNING id, user_id, trainer_id, course_id, certificate_code, 
                 score, issue_date, pdf_file_url, created_at`,
      [
        traineeId,
        attempt.trainer_id,
        courseId,
        attempt.question_bank_id,
        attemptId,
        certificateData.courseName,
        certificateData.issuingBody,
        score,
        certificateCode,
        certificateCode, // verification_code (same as certificate_code for consistency)
        pdfFileUrl,
      ],
    );

    const certificate = certRes.rows[0];

    // Create in-app notification
    await this.createNotification(traineeId, {
      type: 'certificate_issued',
      title: 'Certificate Earned! 🎓',
      message: `You have successfully passed "${attempt.course_title || attempt.qb_title}" and earned a certificate!`,
      referenceId: certificate.id,
      actionUrl: `/trainee/certificates/${certificate.id}`,
      actionLabel: 'View Certificate',
    });

    return {
      id: certificate.id,
      certificateCode: certificate.certificate_code,
      score: certificate.score,
      pdfFileUrl: certificate.pdf_file_url,
      issueDate: certificate.issue_date,
      createdAt: certificate.created_at,
    };
  }

  /**
   * Get certificate by ID
   * Validates user has access based on role
   */
  async getCertificateById(certificateId: string, userId: string, userRole: UserRole): Promise<CertificateResponseDto> {
    const res = await this.db.query(
      `SELECT c.id, c.user_id, c.trainer_id, c.course_id, c.score, 
              c.certificate_code, c.verification_code, c.pdf_file_url,
              c.title, c.issuing_body, c.issue_date, c.is_revoked,
              c.revocation_reason, c.expires_at, c.created_at,
              u_trainee.name as trainee_name,
              u_trainer.name as trainer_name,
              crs.title as course_title
       FROM certificates c
       JOIN users u_trainee ON c.user_id = u_trainee.id
       LEFT JOIN users u_trainer ON c.trainer_id = u_trainer.id
       LEFT JOIN courses crs ON c.course_id = crs.id
       WHERE c.id = $1`,
      [certificateId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Certificate not found');
    }

    const cert = res.rows[0];

    // Access control
    if (
      userRole === UserRole.TRAINEE &&
      cert.user_id !== userId
    ) {
      throw new ForbiddenException('You can only view your own certificates');
    }

    if (userRole === UserRole.TRAINER && cert.trainer_id !== userId) {
      throw new ForbiddenException(
        'You can only view certificates from courses you teach',
      );
    }

    return this.mapCertificateToDto(cert);
  }

  /**
   * List certificates for current user
   */
  async getUserCertificates(
    userId: string,
    userRole: UserRole,
    page: number = 1,
    limit: number = 10,
  ) {
    let whereClause = '';
    let params: any[] = [];

    if (userRole === UserRole.TRAINEE) {
      whereClause = 'c.user_id = $1';
      params = [userId];
    } else if (userRole === UserRole.TRAINER) {
      whereClause = 'c.trainer_id = $1';
      params = [userId];
    }
    // Admin sees all (no where clause)

    const offset = (page - 1) * limit;

    // Get total count
    const countRes = await this.db.query(
      `SELECT COUNT(*) as total FROM certificates c ${whereClause ? `WHERE ${whereClause}` : ''}`,
      params,
    );
    const total = parseInt(countRes.rows[0].total);

    // Get paginated results
    const res = await this.db.query(
      `SELECT c.id, c.user_id, c.trainer_id, c.course_id, c.score, 
              c.certificate_code, c.verification_code, c.pdf_file_url,
              c.title, c.issuing_body, c.issue_date, c.is_revoked,
              c.revocation_reason, c.expires_at, c.created_at,
              u_trainee.name as trainee_name,
              u_trainer.name as trainer_name,
              crs.title as course_title
       FROM certificates c
       JOIN users u_trainee ON c.user_id = u_trainee.id
       LEFT JOIN users u_trainer ON c.trainer_id = u_trainer.id
       LEFT JOIN courses crs ON c.course_id = crs.id
       ${whereClause ? `WHERE ${whereClause}` : ''}
       ORDER BY c.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    return {
      certificates: res.rows.map((cert) => this.mapCertificateToDto(cert)),
      total,
      page,
      limit,
    };
  }

  /**
   * Revoke a certificate (Admin/Trainer only)
   */
  async revokeCertificate(
    certificateId: string,
    userId: string,
    userRole: UserRole,
    dto: RevokeCertificateDto,
  ) {
    const certRes = await this.db.query(
      'SELECT id, trainer_id, is_revoked FROM certificates WHERE id = $1',
      [certificateId],
    );

    if (certRes.rows.length === 0) {
      throw new NotFoundException('Certificate not found');
    }

    const cert = certRes.rows[0];

    // Only the issuing trainer or admin can revoke
    if (userRole === UserRole.TRAINER && cert.trainer_id !== userId) {
      throw new ForbiddenException('You can only revoke certificates from your courses');
    }

    if (cert.is_revoked) {
      throw new BadRequestException('Certificate is already revoked');
    }

    // Revoke certificate
    const revRes = await this.db.query(
      `UPDATE certificates
       SET is_revoked = TRUE, revoked_at = NOW(), revocation_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, is_revoked, revoked_at, revocation_reason`,
      [dto.reason, certificateId],
    );

    return {
      id: revRes.rows[0].id,
      isRevoked: revRes.rows[0].is_revoked,
      revokedAt: revRes.rows[0].revoked_at,
      revocationReason: revRes.rows[0].revocation_reason,
    };
  }

  /**
   * Create shareable link for certificate
   */
  async createShareLink(
    certificateId: string,
    userId: string,
    userRole: UserRole,
    dto: CreateShareLinkDto,
  ): Promise<ShareLinkResponseDto> {
    // Verify ownership
    const certRes = await this.db.query('SELECT id, user_id FROM certificates WHERE id = $1', [
      certificateId,
    ]);

    if (certRes.rows.length === 0) {
      throw new NotFoundException('Certificate not found');
    }

    const cert = certRes.rows[0];

    if (userRole === UserRole.TRAINEE && cert.user_id !== userId) {
      throw new ForbiddenException('You can only create share links for your own certificates');
    }

    const shareToken = this.generateShareToken();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const shareRes = await this.db.query(
      `INSERT INTO certificate_shares (certificate_id, share_token, is_public, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, share_token, is_public, expires_at, created_at`,
      [certificateId, shareToken, dto.isPublic || false, expiresAt],
    );

    const share = shareRes.rows[0];

    return {
      shareToken: share.share_token,
      shareUrl: `${process.env.FRONTEND_URL || 'https://syllabiq.gov.in'}/certificates/share/${share.share_token}`,
      isPublic: share.is_public,
      expiresAt: share.expires_at ? new Date(share.expires_at).toISOString() : undefined,
      createdAt: new Date(share.created_at).toISOString(),
    };
  }

  /**
   * Get certificate by share token (public or authorized access)
   */
  async getCertificateByShareToken(shareToken: string): Promise<CertificateResponseDto> {
    const shareRes = await this.db.query(
      `SELECT cs.id, cs.certificate_id, cs.is_public, cs.expires_at
       FROM certificate_shares cs
       WHERE cs.share_token = $1`,
      [shareToken],
    );

    if (shareRes.rows.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    const share = shareRes.rows[0];

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new BadRequestException('This share link has expired');
    }

    // Fetch certificate
    const certRes = await this.db.query(
      `SELECT c.id, c.user_id, c.trainer_id, c.course_id, c.score, 
              c.certificate_code, c.verification_code, c.pdf_file_url,
              c.title, c.issuing_body, c.issue_date, c.is_revoked,
              c.revocation_reason, c.expires_at, c.created_at,
              u_trainee.name as trainee_name,
              u_trainer.name as trainer_name,
              crs.title as course_title
       FROM certificates c
       JOIN users u_trainee ON c.user_id = u_trainee.id
       LEFT JOIN users u_trainer ON c.trainer_id = u_trainer.id
       LEFT JOIN courses crs ON c.course_id = crs.id
       WHERE c.id = $1`,
      [share.certificate_id],
    );

    if (certRes.rows.length === 0) {
      throw new NotFoundException('Certificate not found');
    }

    return this.mapCertificateToDto(certRes.rows[0]);
  }

  /**
   * Verify certificate authenticity (public endpoint)
   */
  async verifyCertificate(code: string) {
    const res = await this.db.query(
      `SELECT c.id, c.title, c.issuing_body, c.issue_date, c.certificate_code,
              c.verification_code, c.pdf_file_url, c.is_revoked, c.revocation_reason,
              u.name as trainee_name, u.email as trainee_email,
              crs.title as course_title
       FROM certificates c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN courses crs ON c.course_id = crs.id
       WHERE c.certificate_code = $1 OR c.verification_code = $1`,
      [code],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Certificate verification failed. No matching credential found.');
    }

    const cert = res.rows[0];

    return {
      valid: !cert.is_revoked,
      isRevoked: cert.is_revoked,
      revocationReason: cert.revocation_reason,
      verificationCode: cert.verification_code || cert.id,
      certificateCode: cert.certificate_code,
      title: cert.title,
      traineeName: cert.trainee_name,
      issuingBody: cert.issuing_body,
      issueDate: cert.issue_date,
      courseTitle: cert.course_title || 'Autonomous Ministry Accreditation',
      verificationUrl: `https://syllabiq.gov.in/verify/${cert.certificate_code || cert.id}`,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Download certificate PDF
   */
  async downloadCertificatePdf(certificateId: string, userId: string, userRole: UserRole): Promise<Buffer> {
    const cert = await this.getCertificateById(certificateId, userId, userRole);

    if (!cert.pdfFileUrl) {
      throw new NotFoundException('PDF not available for this certificate');
    }

    // Download from storage
    const buffer = await this.storageService.download(cert.pdfFileUrl);
    return buffer;
  }

  /**
   * Get certificate statistics for admin dashboard
   */
  async getCertificateStats() {
    const totalRes = await this.db.query('SELECT COUNT(*) as total FROM certificates');
    const totalCerts = parseInt(totalRes.rows[0].total);

    const revokedRes = await this.db.query('SELECT COUNT(*) as total FROM certificates WHERE is_revoked = TRUE');
    const revokedCerts = parseInt(revokedRes.rows[0].total);

    const monthlyRes = await this.db.query(
      `SELECT DATE_TRUNC('month', issue_date)::date as month, COUNT(*) as count
       FROM certificates
       WHERE issue_date >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', issue_date)
       ORDER BY month ASC`,
    );

    return {
      totalCertificates: totalCerts,
      revokedCertificates: revokedCerts,
      activeCertificates: totalCerts - revokedCerts,
      monthlyIssuance: monthlyRes.rows,
    };
  }

  // ============ HELPER METHODS ============

  private generateCertificateCode(): string {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `CERT-MOES-${year}-${random}`;
  }

  private generateShareToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private mapCertificateToDto(row: any): CertificateResponseDto {
    return {
      id: row.id,
      traineeName: row.trainee_name,
      courseName: row.course_title || 'Course',
      trainerName: row.trainer_name || 'Unknown Trainer',
      title: row.title,
      issuingBody: row.issuing_body,
      issueDate: new Date(row.issue_date).toISOString().split('T')[0],
      score: row.score,
      certificateCode: row.certificate_code,
      verificationCode: row.verification_code,
      pdfFileUrl: row.pdf_file_url,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
      isRevoked: row.is_revoked || false,
      revocationReason: row.revocation_reason,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private async createNotification(userId: string, data: any) {
    try {
      await this.db.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_id, action_url, action_label)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, data.type, data.title, data.message, data.referenceId, data.actionUrl, data.actionLabel],
      );
    } catch (error) {
      // Log but don't fail if notification creation fails
      console.error('Failed to create notification:', error);
    }
  }
}
