import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { AiGeneratorService } from './ai-generator.service';
import { AiPdfGeneratorService } from './ai-pdf-generator.service';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../../common/storage/storage.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [UsersModule, StorageModule, CertificatesModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, AiGeneratorService, AiPdfGeneratorService],
  exports: [AssessmentsService, AiGeneratorService, AiPdfGeneratorService],
})
export class AssessmentsModule {}

