import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get notifications for current user
   */
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notifications',
    description: 'Get paginated notifications for the current user (unread first)',
  })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('unreadOnly') unreadOnly: boolean = false,
  ) {
    return this.notificationsService.getUserNotifications(user.id, page, limit, unreadOnly);
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get unread count',
    description: 'Get count of unread notifications',
  })
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark as read',
    description: 'Mark a notification as read',
  })
  async markAsRead(
    @Param('id', new ParseUUIDPipe()) notificationId: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.id);
  }

  /**
   * Mark all notifications as read
   */
  @Patch('mark-all-read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark all as read',
    description: 'Mark all notifications as read',
  })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  /**
   * Delete notification
   */
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Delete a notification',
  })
  async deleteNotification(
    @Param('id', new ParseUUIDPipe()) notificationId: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.deleteNotification(notificationId, user.id);
  }
}
