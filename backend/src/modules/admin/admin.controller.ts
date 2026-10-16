import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AssignTrainerDto } from './dto/assign-trainer.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List and filter users (e.g. status=pending)' })
  async getUsers(
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(status, role, search);
  }

  @Patch('users/:id/approve')
  @ApiOperation({ summary: 'Approve a pending trainee or trainer registration' })
  async approveUser(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.approveUser(userId, adminId);
  }

  @Patch('users/:id/reject')
  @ApiOperation({ summary: 'Reject a pending user registration' })
  async rejectUser(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectUser(userId, adminId, reason);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change user role (trainee / trainer / admin)' })
  async updateUserRole(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(userId, adminId, dto.role);
  }

  @Post('courses/:id/assign-trainer')
  @ApiOperation({ summary: 'Manually assign or reassign a course to a trainer (Admin override)' })
  async assignTrainer(
    @Param('id') courseId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AssignTrainerDto,
  ) {
    return this.adminService.assignCourseTrainer(courseId, dto.trainer_id, adminId);
  }

  @Get('dashboard/enrollments')
  @ApiOperation({ summary: 'Get enrollment trends and completion metrics with date-range filtering' })
  async getDashboardEnrollments(@Query() query: DashboardQueryDto) {
    return this.adminService.getDashboardEnrollments(query.from, query.to);
  }

  @Get('dashboard/certifications')
  @ApiOperation({ summary: 'Get certification issuance stats with date-range filtering' })
  async getDashboardCertifications(@Query() query: DashboardQueryDto) {
    return this.adminService.getDashboardCertifications(query.from, query.to);
  }

  @Get('dashboard/assessments')
  @ApiOperation({ summary: 'Get assessment pass/fail rates and score averages by course & subject skill' })
  async getDashboardAssessments(@Query() query: DashboardQueryDto) {
    return this.adminService.getDashboardAssessments(query.from, query.to);
  }

  @Get('dashboard/participation')
  @ApiOperation({ summary: 'Get active user counts, role distribution, most active courses, and skill-gap heatmap' })
  async getDashboardParticipation(@Query() query: DashboardQueryDto) {
    return this.adminService.getDashboardParticipation(query.from, query.to);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get system audit trail logs (paginated and filterable by actor, action, date)' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Alias for audit logs endpoint' })
  async getAuditLogAlias(@Query() query: AuditLogQueryDto) {
    return this.adminService.getAuditLogs(query);
  }
}
