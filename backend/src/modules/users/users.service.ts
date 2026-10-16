import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { StorageService, UploadedMulterFile } from '../../common/storage/storage.service';
import { UpdateTraineeProfileDto } from './dto/update-trainee-profile.dto';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';
import { UploadCertificateDto } from './dto/upload-certificate.dto';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    private db: DatabaseService,
    private storageService: StorageService,
  ) {}

  async getMe(userId: string) {
    const userRes = await this.db.query(
      `SELECT id, name, email, role, status, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId],
    );

    if (userRes.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const user = userRes.rows[0];
    let profile: any = null;

    if (user.role === UserRole.TRAINEE) {
      const pRes = await this.db.query(
        `SELECT id, qualifications, work_experience, interests, bio
         FROM trainee_profiles WHERE user_id = $1`,
        [userId],
      );
      profile = pRes.rows[0] || {
        qualifications: [],
        work_experience: [],
        interests: [],
        bio: null,
      };
    } else if (user.role === UserRole.TRAINER) {
      const pRes = await this.db.query(
        `SELECT id, bio, years_experience, qualifications
         FROM trainer_profiles WHERE user_id = $1`,
        [userId],
      );
      profile = pRes.rows[0] || {
        bio: null,
        years_experience: 0,
        qualifications: [],
      };
    }

    // Skills
    const skillsRes = await this.db.query(
      `SELECT us.id, s.id as skill_id, s.name, s.category, us.proficiency_level, us.source
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1
       ORDER BY s.category, s.name ASC`,
      [userId],
    );

    // Certificates
    const certsRes = await this.db.query(
      `SELECT id, title, issuing_body, issue_date, file_url, course_id, created_at
       FROM certificates WHERE user_id = $1 ORDER BY issue_date DESC`,
      [userId],
    );

    const certificates = certsRes.rows.map((c) => ({
      ...c,
      signed_url: c.file_url ? this.storageService.generateSignedUrl(c.file_url) : null,
    }));

    return {
      user,
      profile,
      skills: skillsRes.rows,
      certificates,
    };
  }

  async getTraineeProfile(userId: string) {
    return this.getMe(userId);
  }

  async updateTraineeProfile(userId: string, dto: UpdateTraineeProfileDto) {
    const userRes = await this.db.query('SELECT id, role, name FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    if (dto.name) {
      await this.db.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [
        dto.name,
        userId,
      ]);
    }

    const qualificationsJson = dto.qualifications ? JSON.stringify(dto.qualifications) : null;
    const workExperienceJson = dto.work_experience ? JSON.stringify(dto.work_experience) : null;
    const interestsArr = dto.interests || null;

    await this.db.query(
      `INSERT INTO trainee_profiles (user_id, bio, qualifications, work_experience, interests)
       VALUES ($1, $2, COALESCE($3::jsonb, '[]'::jsonb), COALESCE($4::jsonb, '[]'::jsonb), COALESCE($5, '{}'))
       ON CONFLICT (user_id) DO UPDATE SET
         bio = COALESCE($2, trainee_profiles.bio),
         qualifications = CASE WHEN $3::jsonb IS NOT NULL THEN $3::jsonb ELSE trainee_profiles.qualifications END,
         work_experience = CASE WHEN $4::jsonb IS NOT NULL THEN $4::jsonb ELSE trainee_profiles.work_experience END,
         interests = CASE WHEN $5 IS NOT NULL THEN $5 ELSE trainee_profiles.interests END`,
      [userId, dto.bio !== undefined ? dto.bio : null, qualificationsJson, workExperienceJson, interestsArr],
    );

    return this.getMe(userId);
  }

  async getTrainerProfile(userId: string) {
    const userRes = await this.db.query(
      `SELECT id, name, email, role, status FROM users WHERE id = $1`,
      [userId],
    );

    if (userRes.rows.length === 0) {
      throw new NotFoundException('Trainer not found');
    }

    const user = userRes.rows[0];

    const pRes = await this.db.query(
      `SELECT id, bio, years_experience, qualifications
       FROM trainer_profiles WHERE user_id = $1`,
      [userId],
    );

    const profile = pRes.rows[0] || {
      bio: null,
      years_experience: 0,
      qualifications: [],
    };

    const skillsRes = await this.db.query(
      `SELECT us.id, s.id as skill_id, s.name, s.category, us.proficiency_level, us.source
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1
       ORDER BY s.category, s.name ASC`,
      [userId],
    );

    return {
      user,
      profile,
      skills: skillsRes.rows,
    };
  }

  async updateTrainerProfile(userId: string, dto: UpdateTrainerProfileDto) {
    const userRes = await this.db.query('SELECT id, role, name FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    if (dto.name) {
      await this.db.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [
        dto.name,
        userId,
      ]);
    }

    const qualificationsJson = dto.qualifications ? JSON.stringify(dto.qualifications) : null;
    const yearsExp =
      dto.years_experience !== undefined
        ? dto.years_experience
        : (dto as any).yearsExperience !== undefined
        ? (dto as any).yearsExperience
        : null;

    await this.db.query(
      `INSERT INTO trainer_profiles (user_id, bio, years_experience, qualifications)
       VALUES ($1, $2, COALESCE($3, 0), COALESCE($4::jsonb, '[]'::jsonb))
       ON CONFLICT (user_id) DO UPDATE SET
         bio = COALESCE($2, trainer_profiles.bio),
         years_experience = COALESCE($3, trainer_profiles.years_experience),
         qualifications = CASE WHEN $4::jsonb IS NOT NULL THEN $4::jsonb ELSE trainer_profiles.qualifications END`,
      [userId, dto.bio !== undefined ? dto.bio : null, yearsExp, qualificationsJson],
    );

    return this.getTrainerProfile(userId);
  }

  async uploadCertificate(
    userId: string,
    file: UploadedMulterFile,
    dto: UploadCertificateDto,
  ) {
    if (!file) {
      throw new BadRequestException('Certificate file is required (PDF or image)');
    }

    // Save file via storage service
    const savedFile = await this.storageService.saveFile(file, 'certificates');

    const res = await this.db.query(
      `INSERT INTO certificates (user_id, title, issuing_body, issue_date, file_url, course_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, title, issuing_body, issue_date, file_url, course_id, created_at`,
      [
        userId,
        dto.title,
        dto.issuing_body,
        dto.issue_date,
        savedFile.filename,
        dto.course_id || null,
      ],
    );

    const certificate = res.rows[0];
    const signedUrl = this.storageService.generateSignedUrl(certificate.file_url);

    return {
      message: 'Certificate uploaded successfully',
      certificate: {
        ...certificate,
        signed_url: signedUrl,
      },
    };
  }

  async getCertificates(userId: string) {
    const res = await this.db.query(
      `SELECT id, user_id, title, issuing_body, issue_date, file_url, course_id, created_at
       FROM certificates WHERE user_id = $1 ORDER BY issue_date DESC`,
      [userId],
    );

    return res.rows.map((c) => ({
      ...c,
      signed_url: c.file_url ? this.storageService.generateSignedUrl(c.file_url) : null,
    }));
  }

  async getPublicProfile(targetUserId: string) {
    const userRes = await this.db.query(
      `SELECT id, name, role, created_at FROM users WHERE id = $1`,
      [targetUserId],
    );

    if (userRes.rows.length === 0) {
      throw new NotFoundException('User profile not found');
    }

    const user = userRes.rows[0];
    let profile: any = null;

    if (user.role === UserRole.TRAINER) {
      const pRes = await this.db.query(
        `SELECT bio, years_experience, qualifications
         FROM trainer_profiles WHERE user_id = $1`,
        [targetUserId],
      );
      profile = pRes.rows[0] || null;
    } else if (user.role === UserRole.TRAINEE) {
      const pRes = await this.db.query(
        `SELECT bio, qualifications, work_experience, interests
         FROM trainee_profiles WHERE user_id = $1`,
        [targetUserId],
      );
      profile = pRes.rows[0] || null;
    }

    const skillsRes = await this.db.query(
      `SELECT us.id, s.id as skill_id, s.name, s.category, us.proficiency_level, us.source
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1
       ORDER BY s.category, s.name ASC`,
      [targetUserId],
    );

    const certsRes = await this.db.query(
      `SELECT id, title, issuing_body, issue_date, course_id
       FROM certificates WHERE user_id = $1 ORDER BY issue_date DESC`,
      [targetUserId],
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        joinedAt: user.created_at,
      },
      profile,
      skills: skillsRes.rows,
      certificates: certsRes.rows,
    };
  }
}
