import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class NotificationsService {
  constructor(private db: DatabaseService) {}

  /**
   * Create a notification
   */
  async createNotification(userId: string, data: {
    type: string;
    title: string;
    message?: string;
    referenceId?: string;
    actionUrl?: string;
    actionLabel?: string;
  }) {
    const res = await this.db.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, action_url, action_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, type, title, message, reference_id, is_read, action_url, action_label, created_at`,
      [
        userId,
        data.type,
        data.title,
        data.message || null,
        data.referenceId || null,
        data.actionUrl || null,
        data.actionLabel || null,
      ],
    );

    return res.rows[0];
  }

  /**
   * Get notifications for a user (paginated, unread first)
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ) {
    const offset = (page - 1) * limit;

    let whereClause = 'n.user_id = $1';
    const params: any[] = [userId];

    if (unreadOnly) {
      whereClause += ' AND n.is_read = FALSE';
    }

    // Get total count
    const countRes = await this.db.query(
      `SELECT COUNT(*) as total FROM notifications n WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countRes.rows[0].total);

    // Get paginated results
    const res = await this.db.query(
      `SELECT id, user_id, type, title, message, reference_id, is_read, 
              action_url, action_label, created_at
       FROM notifications n
       WHERE ${whereClause}
       ORDER BY is_read ASC, created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    return {
      notifications: res.rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        referenceId: n.reference_id,
        isRead: n.is_read,
        actionUrl: n.action_url,
        actionLabel: n.action_label,
        createdAt: new Date(n.created_at).toISOString(),
      })),
      total,
      unreadCount: res.rows.filter((n) => !n.is_read).length,
      page,
      limit,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const res = await this.db.query(
      `UPDATE notifications
       SET is_read = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read, updated_at`,
      [notificationId, userId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Notification not found');
    }

    return res.rows[0];
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    const res = await this.db.query(
      `UPDATE notifications
       SET is_read = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING id`,
      [userId],
    );

    return {
      marked: res.rows.length,
    };
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const res = await this.db.query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Notification not found');
    }

    return { deleted: true };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    const res = await this.db.query(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );

    return {
      unreadCount: parseInt(res.rows[0].total),
    };
  }
}
