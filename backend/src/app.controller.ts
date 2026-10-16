import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health & Info')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API root information and health check' })
  getRoot() {
    return {
      status: 'healthy',
      name: 'SyllabIQ API',
      version: '1.0.0',
      description: 'Digital Capacity Building & Learning Management Portal',
      documentation: '/api/docs',
      portal: 'http://localhost:5173',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Service health check endpoint' })
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
