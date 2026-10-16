import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
// Cookie Parser
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cp = require('cookie-parser');

async function bootstrap() {
  const logger = new Logger('SyllabIQ-Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Cookie Parser Middleware
  const parseCookies = typeof cp === 'function' ? cp : cp.default;
  if (typeof parseCookies === 'function') {
    app.use(parseCookies());
  }

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS
  app.enableCors({
    origin: true, // Allows localhost, 127.0.0.1, and local LAN IP (e.g. 10.76.x.x)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger / OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('SyllabIQ API')
    .setDescription(
      'Digital Capacity Building & Learning Management Portal (MoES / SIH26076) — OpenAPI 3.0 Specification',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and session management')
    .addTag('Users', 'User profiles and personal skills')
    .addTag('Courses', 'Course catalog, resources, and enrollments')
    .addTag('Assessments', 'MCQ Question banks and auto-graded attempts')
    .addTag('Skills & Competency', 'Skill taxonomy and trainer-matching algorithm')
    .addTag('Announcements', 'Platform news and achievements')
    .addTag('Admin', 'User approval gate, role management, analytics, and audit log')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 SyllabIQ Backend is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger Documentation is available on: http://localhost:${port}/api/docs`);
}

bootstrap();
