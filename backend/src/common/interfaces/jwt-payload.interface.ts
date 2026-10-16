import { UserRole } from '../enums/role.enum';
import { UserStatus } from '../enums/status.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name: string;
  iat?: number;
  exp?: number;
}
