import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificatePdfGeneratorService } from './pdf-generator.service';
import { DatabaseModule } from '../../database/database.module';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificatePdfGeneratorService],
  exports: [CertificatesService], // Export for other modules (like assessments)
})
export class CertificatesModule {}
