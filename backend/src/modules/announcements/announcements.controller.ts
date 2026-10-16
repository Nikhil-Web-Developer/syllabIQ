import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Public()
  @Get('announcements')
  @ApiOperation({ summary: 'Get recent platform announcements and achievements (Public feed with optional type filtering and pagination)' })
  async getAnnouncements(@Query() query: AnnouncementQueryDto) {
    return this.announcementsService.getAnnouncements(query);
  }

  @Public()
  @Get('announcements/:id')
  @ApiOperation({ summary: 'Get single announcement details by ID' })
  async getAnnouncementById(@Param('id') id: string) {
    return this.announcementsService.getAnnouncementById(id);
  }

  @ApiBearerAuth()
  @Post('admin/announcements')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish new announcement, achievement, or content broadcast (Admin only)' })
  async createAnnouncement(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.createAnnouncement(userId, dto);
  }

  @ApiBearerAuth()
  @Patch('admin/announcements/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Edit/update an existing announcement (Admin only)' })
  async updateAnnouncement(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.updateAnnouncement(id, userId, dto);
  }

  @ApiBearerAuth()
  @Delete('admin/announcements/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an announcement (Admin only)' })
  async deleteAnnouncement(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.announcementsService.deleteAnnouncement(id, userId);
  }
}
