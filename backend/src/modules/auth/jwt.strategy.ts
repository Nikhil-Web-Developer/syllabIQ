import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_ACCESS_SECRET',
        'syllabiq_super_secret_access_jwt_key_2026_moes',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    // Verify user exists and status in DB
    const res = await this.db.query(
      'SELECT id, name, email, role, status FROM users WHERE id = $1',
      [payload.sub],
    );

    if (res.rows.length === 0) {
      throw new UnauthorizedException('User account no longer exists');
    }

    const user = res.rows[0];
    if (user.status === 'suspended') {
      throw new UnauthorizedException('Account has been suspended by an administrator');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  }
}
