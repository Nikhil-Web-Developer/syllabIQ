import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CoursesService } from './courses.service';
import { CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UploadResourceDto } from './dto/upload-resource.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { UploadedMulterFile } from '../../common/storage/storage.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Courses & Enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  // ==========================================
  // 1. Course Catalog & Lifecycle Endpoints
  // ==========================================

  @Public()
  @Get('courses')
  @ApiOperation({ summary: 'List and filter published courses in catalog' })
  async getCourses(
    @Query() query: CourseQueryDto,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.coursesService.getCourses(query, currentUserId);
  }

  @ApiBearerAuth()
  @Post('courses')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new course module as draft (Trainer or Admin)' })
  async createCourse(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCourseDto,
  ) {
    return this.coursesService.createCourse(userId, dto);
  }

  @Public()
  @Get('courses/:id')
  @ApiOperation({ summary: 'Get course detail (drafts only visible to owner/admin)' })
  async getCourseById(
    @Param('id') id: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: string,
  ) {
    return this.coursesService.getCourseById(id, userId, userRole);
  }

  @ApiBearerAuth()
  @Patch('courses/:id')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update course metadata' })
  async updateCourse(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: Partial<CreateCourseDto>,
  ) {
    return this.coursesService.updateCourse(id, userId, role, dto);
  }

  @ApiBearerAuth()
  @Patch('courses/:id/publish')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish course to make it visible in public catalog' })
  async publishCourse(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.coursesService.publishCourse(id, userId, role);
  }

  @ApiBearerAuth()
  @Patch('courses/:id/archive')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Archive course from active catalog' })
  async archiveCourse(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.coursesService.archiveCourse(id, userId, role);
  }

  @ApiBearerAuth()
  @Delete('courses/:id')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete course (soft-archives if active enrollments exist)' })
  async deleteCourse(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.coursesService.deleteCourse(id, userId, role);
  }

  // ==========================================
  // 2. Resource Library Endpoints
  // ==========================================

  @ApiBearerAuth()
  @Post('courses/:id/resources')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload course lecture resource file or external link' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Module 1: WRF Model Equations' },
        type: { type: 'string', enum: ['video', 'pdf', 'ppt', 'doc', 'link'], example: 'pdf' },
        link_url: { type: 'string', example: 'https://example.com' },
      },
      required: ['title', 'type'],
    },
  })
  async addResource(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @UploadedFile() file: UploadedMulterFile,
    @Body() dto: UploadResourceDto,
  ) {
    return this.coursesService.addResource(id, userId, role, file, dto);
  }

  @ApiBearerAuth()
  @Get('courses/:id/resources')
  @ApiOperation({ summary: 'Get course resources (only accessible to enrolled trainees, owning trainer, admin)' })
  async getResources(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.coursesService.getResources(id, userId, role);
  }

  @ApiBearerAuth()
  @Delete('courses/:id/resources/:resourceId')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete course resource' })
  async deleteResource(
    @Param('id') courseId: string,
    @Param('resourceId') resourceId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.coursesService.deleteResource(courseId, resourceId, userId, role);
  }

  // ==========================================
  // 3. Enrollment & Participation Monitoring
  // ==========================================

  @ApiBearerAuth()
  @Post('enrollments')
  @Roles(UserRole.TRAINEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Self-enroll in a course (Trainee)' })
  async createEnrollment(
    @Body() dto: EnrollCourseDto,
    @CurrentUser('id') traineeId: string,
  ) {
    const targetCourseId = dto.courseId || dto.course_id;
    if (!targetCourseId) {
      throw new BadRequestException('courseId is required');
    }
    return this.coursesService.enrollCourse(targetCourseId, traineeId);
  }

  @ApiBearerAuth()
  @Post('courses/:id/enroll')
  @Roles(UserRole.TRAINEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Self-enroll in a published course (Trainee)' })
  async enrollCourse(
    @Param('id') id: string,
    @CurrentUser('id') traineeId: string,
  ) {
    return this.coursesService.enrollCourse(id, traineeId);
  }

  @ApiBearerAuth()
  @Get('users/me/enrollments')
  @Roles(UserRole.TRAINEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current trainee enrollment list with progress' })
  async getTraineeEnrollments(@CurrentUser('id') traineeId: string) {
    return this.coursesService.getTraineeEnrollments(traineeId);
  }

  @ApiBearerAuth()
  @Patch('enrollments/:id/progress')
  @Roles(UserRole.TRAINEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update enrollment progress percentage' })
  async updateEnrollmentProgress(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.coursesService.updateEnrollmentProgress(id, userId, role, dto.progress_percent);
  }

  @ApiBearerAuth()
  @Patch('enrollments/:id/status')
  @Roles(UserRole.TRAINEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update enrollment status (e.g. mark dropped)' })
  async updateEnrollmentStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body('status') status: string,
  ) {
    return this.coursesService.updateEnrollmentStatus(id, userId, role, status);
  }

  @ApiBearerAuth()
  @Get('courses/:id/enrollments')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Monitor enrolled trainees and their progress (Trainer/Admin)' })
  async getCourseEnrollments(
    @Param('id') courseId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.coursesService.getCourseEnrollments(courseId, userId, role);
  }

  @ApiBearerAuth()
  @Post('courses/:id/feedback')
  @Roles(UserRole.TRAINEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit feedback and rating for a course' })
  async addFeedback(
    @Param('id') id: string,
    @CurrentUser('id') traineeId: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.coursesService.addFeedback(id, traineeId, body.rating, body.comment);
  }

  @ApiBearerAuth()
  @Post('courses/:id/ai-chat')
  @Roles(UserRole.TRAINEE, UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ask AI Chatbot questions about this course and materials (Gemini)' })
  async askCourseAi(
    @Param('id') courseId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body('message') message: string,
  ) {
    if (!message || !message.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }
    return this.coursesService.askCourseAi(courseId, userId, role, message.trim());
  }
}
