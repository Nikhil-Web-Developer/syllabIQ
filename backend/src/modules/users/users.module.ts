import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CertificatesController } from './certificates.controller';
import { BadgesService } from './badges.service';

@Module({
  controllers: [UsersController, CertificatesController],
  providers: [UsersService, BadgesService],
  exports: [UsersService, BadgesService],
})
export class UsersModule {}

