import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseService } from './database.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dbService = app.get(DatabaseService);

  console.log('Running SyllabIQ database migrations...');
  try {
    await dbService.runMigrations();
    console.log('Database migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
