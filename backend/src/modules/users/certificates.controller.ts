import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../../database/database.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Certificates')
@Controller()
export class CertificatesController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get('certificates/verify/:code')
  @ApiOperation({
    summary: 'Public verification endpoint for certificate authenticity (Unauthenticated)',
  })
  async verifyCertificate(@Param('code') code: string) {
    const res = await this.db.query(
      `SELECT c.id, c.title, c.issuing_body, c.issue_date, c.verification_code, c.file_url,
              u.name as trainee_name, u.email as trainee_email,
              crs.title as course_title
       FROM certificates c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN courses crs ON c.course_id = crs.id
       WHERE c.verification_code = $1 OR c.id::text = $1`,
      [code],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Certificate verification failed. No matching credential found.');
    }

    const cert = res.rows[0];
    return {
      valid: true,
      verification_code: cert.verification_code || cert.id,
      title: cert.title,
      trainee_name: cert.trainee_name,
      issuing_body: cert.issuing_body,
      issue_date: cert.issue_date,
      course_title: cert.course_title || 'Autonomous Ministry Accreditation',
      verification_url: `https://syllabiq.gov.in/verify/${cert.verification_code || cert.id}`,
      verified_at: new Date().toISOString(),
    };
  }

  @Public()
  @Get('badges')
  @ApiOperation({ summary: 'List all available platform gamification badges' })
  async getBadges() {
    const res = await this.db.query(
      `SELECT id, code, title, description, icon, criteria, category FROM badges ORDER BY created_at ASC`,
    );
    return res.rows;
  }
}
