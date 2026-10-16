import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
    name: string;
  };
}
