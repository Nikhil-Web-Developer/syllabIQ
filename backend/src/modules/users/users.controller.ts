import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { UsersService } from './users.service';
import { UploadedMulterFile } from '../../common/storage/storage.service';
import { UpdateTraineeProfileDto } from './dto/update-trainee-profile.dto';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';
import { UploadCertificateDto } from './dto/upload-certificate.dto';
import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Users & Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private badgesService: BadgesService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get('me/profile')
  @ApiOperation({ summary: 'Get current user profile (trainee or trainer)' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getTraineeProfile(userId);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update trainee profile (bio, qualifications, experience, interests)' })
  async updateTraineeProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTraineeProfileDto,
  ) {
    return this.usersService.updateTraineeProfile(userId, dto);
  }

  @Patch('me/trainee-profile')
  @ApiOperation({ summary: 'Update trainee profile (alias)' })
  async updateTraineeProfileAlias(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTraineeProfileDto,
  ) {
    return this.usersService.updateTraineeProfile(userId, dto);
  }

  @Get('me/trainer-profile')
  @ApiOperation({ summary: 'Get current trainer profile' })
  async getTrainerProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getTrainerProfile(userId);
  }

  @Patch('me/trainer-profile')
  @ApiOperation({ summary: 'Update trainer profile (bio, years_experience, qualifications)' })
  async updateTrainerProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTrainerProfileDto,
  ) {
    return this.usersService.updateTrainerProfile(userId, dto);
  }

  @Post('me/certificates')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an external or course certificate with signed storage URL' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Advanced Numerical Modeling Certificate' },
        issuing_body: { type: 'string', example: 'IMD / MoES Training Unit' },
        issue_date: { type: 'string', example: '2026-06-01' },
        course_id: { type: 'string', example: 'uuid-optional' },
      },
      required: ['file', 'title', 'issuing_body', 'issue_date'],
    },
  })
  async uploadCertificate(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: UploadedMulterFile,
    @Body() dto: UploadCertificateDto,
  ) {
    return this.usersService.uploadCertificate(userId, file, dto);
  }

  @Get('me/certificates')
  @ApiOperation({ summary: 'Get list of certificates for current user with signed download URLs' })
  async getCertificates(@CurrentUser('id') userId: string) {
    return this.usersService.getCertificates(userId);
  }

  @Get('me/badges')
  @ApiOperation({ summary: 'Get gamification badges and milestones awarded to current user' })
  async getMyBadges(@CurrentUser('id') userId: string) {
    return this.badgesService.getUserBadges(userId);
  }

  @Public()
  @Get(':id/profile')
  @ApiOperation({ summary: 'Get public profile of any user (view-others, sanitized public fields)' })
  async getPublicProfile(@Param('id') targetUserId: string) {
    const profile = await this.usersService.getPublicProfile(targetUserId);
    const badges = await this.badgesService.getUserBadges(targetUserId);
    return {
      ...profile,
      badges,
    };
  }
}
