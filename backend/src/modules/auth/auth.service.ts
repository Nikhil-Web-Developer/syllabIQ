import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from '@node-rs/argon2';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/status.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  private async seedDefaultAdmin() {
    try {
      // 1. Seed Admin
      const existingAdmin = await this.db.query(
        "SELECT id FROM users WHERE email = 'admin@syllabiq.gov.in'",
      );
      if (existingAdmin.rows.length === 0) {
        const hashedPassword = await argon2.hash('Admin@SyllabIQ2026');
        await this.db.query(
          `INSERT INTO users (name, email, password_hash, role, status, is_email_verified)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO NOTHING`,
          [
            'Ministry Admin',
            'admin@syllabiq.gov.in',
            hashedPassword,
            UserRole.ADMIN,
            UserStatus.APPROVED,
            true,
          ],
        );
        this.logger.log('Default Admin seeded: admin@syllabiq.gov.in / Admin@SyllabIQ2026');
      }

      // 2. Seed Approved Trainee
      const existingTrainee = await this.db.query(
        "SELECT id FROM users WHERE email = 'trainee@moes.gov.in'",
      );
      if (existingTrainee.rows.length === 0) {
        const traineePass = await argon2.hash('Trainee@SyllabIQ2026');
        const res = await this.db.query(
          `INSERT INTO users (name, email, password_hash, role, status, is_email_verified)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [
            'Dr. Rajesh Trainee',
            'trainee@moes.gov.in',
            traineePass,
            UserRole.TRAINEE,
            UserStatus.APPROVED,
            true,
          ],
        );
        if (res.rows.length > 0) {
          await this.db.query(
            `INSERT INTO trainee_profiles (user_id, bio, interests, qualifications, work_experience)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
            [
              res.rows[0].id,
              'Scientific Trainee specializing in numerical weather modeling and atmospheric observations.',
              ['Numerical Weather Prediction', 'Monsoon Dynamics', 'GIS Remote Sensing'],
              JSON.stringify([
                { degree: 'Ph.D. in Atmospheric Sciences', institution: 'IIT Delhi', year: 2023 },
              ]),
              JSON.stringify([
                { role: 'Research Fellow', organization: 'IMD Pune', duration: '2023 - Present' },
              ]),
            ],
          );
        }
        this.logger.log('Default Trainee seeded: trainee@moes.gov.in / Trainee@SyllabIQ2026');
      }

      // 3. Seed Approved Trainer
      const existingTrainer = await this.db.query(
        "SELECT id FROM users WHERE email = 'trainer@moes.gov.in'",
      );
      if (existingTrainer.rows.length === 0) {
        const trainerPass = await argon2.hash('Trainer@SyllabIQ2026');
        const res = await this.db.query(
          `INSERT INTO users (name, email, password_hash, role, status, is_email_verified)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [
            'Prof. Pallavi Trainer',
            'trainer@moes.gov.in',
            trainerPass,
            UserRole.TRAINER,
            UserStatus.APPROVED,
            true,
          ],
        );
        if (res.rows.length > 0) {
          await this.db.query(
            `INSERT INTO trainer_profiles (user_id, bio, years_experience, qualifications)
             VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
            [
              res.rows[0].id,
              'Senior Atmospheric Scientist and Modeling Lead with 12 years experience leading national capacity workshops.',
              12,
              JSON.stringify([
                { degree: 'Ph.D. Physical Oceanography', institution: 'Goa University', year: 2012 },
              ]),
            ],
          );
        }
        this.logger.log('Default Trainer seeded: trainer@moes.gov.in / Trainer@SyllabIQ2026');
      }
    } catch (e) {
      this.logger.warn(`User seed check skipped: ${(e as Error).message}`);
    }
  }

  async signup(dto: SignupDto) {
    if (dto.role === (UserRole.ADMIN as any)) {
      throw new BadRequestException('Administrator accounts cannot be self-registered');
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new ConflictException('A user with this email address already exists');
    }

    // 1. Hash password with argon2
    const passwordHash = await argon2.hash(dto.password);

    // 2. Generate 6-digit email verification token
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 3. Trainees and Trainers default to pending status
    const initialStatus = UserStatus.PENDING;

    const userRes = await this.db.query(
      `INSERT INTO users (name, email, password_hash, role, status, is_email_verified, email_verification_token, email_verification_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, role, status, is_email_verified, created_at`,
      [
        dto.name,
        email,
        passwordHash,
        dto.role,
        initialStatus,
        false,
        verificationToken,
        tokenExpires,
      ],
    );

    const user = userRes.rows[0];

    // 4. Initialize profile
    if (dto.role === UserRole.TRAINEE) {
      await this.db.query(
        `INSERT INTO trainee_profiles (user_id, bio) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, dto.bio || null],
      );
    } else if (dto.role === UserRole.TRAINER) {
      await this.db.query(
        `INSERT INTO trainer_profiles (user_id, bio) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, dto.bio || null],
      );
    }

    // 5. Stub email verification sending via logger
    this.logger.log(
      `[EMAIL SERVICE STUB] To: ${email} | Subject: Verify your SyllabIQ Account | Verification Token: ${verificationToken}`,
    );

    return {
      message: 'Signup successful. Your account registration is pending administrator approval.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isEmailVerified: user.is_email_verified,
      },
      verificationTokenStub: verificationToken,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = dto.email.toLowerCase().trim();
    const res = await this.db.query(
      `SELECT id, email_verification_token, email_verification_expires, is_email_verified
       FROM users WHERE email = $1`,
      [email],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('User account not found');
    }

    const user = res.rows[0];

    if (user.is_email_verified) {
      return { message: 'Email is already verified', email };
    }

    if (user.email_verification_token !== dto.token) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.email_verification_expires && new Date() > new Date(user.email_verification_expires)) {
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    await this.db.query(
      `UPDATE users
       SET is_email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL, updated_at = NOW()
       WHERE id = $1`,
      [user.id],
    );

    return {
      message: 'Email address verified successfully',
      email,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const res = await this.db.query(
      `SELECT id, name, email, password_hash, role, status, is_email_verified
       FROM users WHERE email = $1`,
      [email],
    );

    if (res.rows.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = res.rows[0];

    // Verify password (argon2 with bcrypt fallback)
    let isPasswordValid = false;
    try {
      if (user.password_hash.startsWith('$argon2')) {
        isPasswordValid = await argon2.verify(user.password_hash, dto.password);
      } else {
        isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
      }
    } catch {
      try {
        isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
      } catch {
        isPasswordValid = false;
      }
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check account approval status
    if (user.status === UserStatus.PENDING && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Your account registration is currently pending administrator approval.',
      );
    }

    if (user.status === UserStatus.REJECTED) {
      throw new ForbiddenException(
        'Your account registration was rejected by an administrator. Please contact support.',
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException(
        'Your account has been suspended by an administrator. Please contact support.',
      );
    }

    const tokens = await this.generateTokens(user);

    // Save session in Redis
    await this.redis.set(`session:${user.id}`, tokens.refreshToken, 7 * 24 * 3600);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isEmailVerified: user.is_email_verified,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const refreshSecret = this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'syllabiq_super_secret_refresh_jwt_key_2026_moes',
      );

      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const res = await this.db.query(
        `SELECT id, name, email, role, status, is_email_verified
         FROM users WHERE id = $1`,
        [payload.sub],
      );

      if (res.rows.length === 0) {
        throw new UnauthorizedException('User account no longer exists');
      }

      const user = res.rows[0];

      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Account has been suspended');
      }

      const tokens = await this.generateTokens(user);
      await this.redis.set(`session:${user.id}`, tokens.refreshToken, 7 * 24 * 3600);

      return {
        message: 'Access token refreshed successfully',
        tokens,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.redis.del(`session:${userId}`);
    return { message: 'Logged out successfully' };
  }

  async requestPasswordReset(dto: RequestResetDto) {
    const email = dto.email.toLowerCase().trim();
    const res = await this.db.query('SELECT id, name FROM users WHERE email = $1', [email]);

    // Constant time behavior: don't reveal whether user exists
    if (res.rows.length === 0) {
      return {
        message: 'If an account exists with this email, a password reset link has been dispatched.',
      };
    }

    const user = res.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.db.query(
      `UPDATE users
       SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW()
       WHERE id = $3`,
      [resetToken, expires, user.id],
    );

    this.logger.log(
      `[EMAIL SERVICE STUB] To: ${email} | Subject: Password Reset Request | Reset Token: ${resetToken}`,
    );

    return {
      message: 'If an account exists with this email, a password reset link has been dispatched.',
      resetTokenStub: resetToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const res = await this.db.query(
      `SELECT id, email, password_reset_expires
       FROM users WHERE password_reset_token = $1`,
      [dto.token],
    );

    if (res.rows.length === 0) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const user = res.rows[0];

    if (user.password_reset_expires && new Date() > new Date(user.password_reset_expires)) {
      throw new BadRequestException('Password reset token has expired. Please request a new one.');
    }

    const newHash = await argon2.hash(dto.newPassword);

    await this.db.query(
      `UPDATE users
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
      [newHash, user.id],
    );

    return {
      message: 'Password has been reset successfully. You may now sign in with your new password.',
    };
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    status: string;
    name: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      name: user.name,
    };

    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'syllabiq_super_secret_access_jwt_key_2026_moes',
    );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'syllabiq_super_secret_refresh_jwt_key_2026_moes',
    );

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 mins in seconds
    };
  }
}
