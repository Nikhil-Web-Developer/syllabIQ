import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateAnnouncementDto, AnnouncementType } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';

@Injectable()
export class AnnouncementsService implements OnModuleInit {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(private db: DatabaseService) {}

  async onModuleInit() {
    await this.seedInitialAnnouncements();
  }

  private async seedInitialAnnouncements() {
    try {
      const existing = await this.db.query('SELECT count(*)::int as count FROM announcements');
      if (existing.rows[0]?.count === 0) {
        const adminRes = await this.db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminRes.rows.length > 0) {
          const adminId = adminRes.rows[0].id;
          await this.db.query(
            `INSERT INTO announcements (title, body, type, published_by)
             VALUES ($1, $2, 'announcement', $3), ($4, $5, 'achievement', $3)`,
            [
              'Welcome to SyllabIQ Portal',
              'The Digital Capacity Building and Learning Management Portal is now live for all trainees, trainers, and administrators across MoES institutions.',
              adminId,
              'Over 500 Officers Certified in NWP & Ocean Modeling',
              'SyllabIQ milestone reached with high-performing cohorts across IMD, INCOIS, and NCMRWF units.',
            ],
          );
          this.logger.log('Seeded sample announcements');
        }
      }
    } catch (e) {
      this.logger.warn(`Announcement seed check skipped: ${(e as Error).message}`);
    }
  }

  private async logAudit(actorId: string, action: string, targetId?: string, metadata?: any) {
    try {
      await this.db.query(
        `INSERT INTO audit_logs (actor_id, action, target_id, metadata)
         VALUES ($1, $2, $3, $4)`,
        [actorId, action, targetId || null, metadata ? JSON.stringify(metadata) : '{}'],
      );
    } catch (e) {
      this.logger.warn(`Audit log error: ${(e as Error).message}`);
    }
  }

  async getAnnouncements(query?: AnnouncementQueryDto) {
    let sql = `
      SELECT a.id, a.title, a.body, a.type, a.published_at, a.published_by,
             u.name as author_name, u.email as author_email, u.role as author_role
      FROM announcements a
      JOIN users u ON a.published_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query?.type) {
      params.push(query.type);
      sql += ` AND a.type = $${params.length}`;
    }

    if (query?.search) {
      params.push(`%${query.search}%`);
      sql += ` AND (a.title ILIKE $${params.length} OR a.body ILIKE $${params.length})`;
    }

    sql += ` ORDER BY a.published_at DESC`;

    const limit = query?.limit ? Number(query.limit) : 50;
    const offset = query?.offset ? Number(query.offset) : 0;

    params.push(limit);
    sql += ` LIMIT $${params.length}`;

    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getAnnouncementById(id: string) {
    const res = await this.db.query(
      `SELECT a.id, a.title, a.body, a.type, a.published_at, a.published_by,
              u.name as author_name, u.email as author_email
       FROM announcements a
       JOIN users u ON a.published_by = u.id
       WHERE a.id = $1`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Announcement not found');
    }

    return res.rows[0];
  }

  async createAnnouncement(userId: string, dto: CreateAnnouncementDto) {
    const res = await this.db.query(
      `INSERT INTO announcements (title, body, type, published_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, body, type, published_by, published_at`,
      [dto.title, dto.body, dto.type || AnnouncementType.ANNOUNCEMENT, userId],
    );

    const announcement = res.rows[0];

    await this.logAudit(userId, 'published_announcement', announcement.id, {
      title: announcement.title,
      type: announcement.type,
    });

    return announcement;
  }

  async updateAnnouncement(id: string, userId: string, dto: UpdateAnnouncementDto) {
    const check = await this.db.query('SELECT id, title, type FROM announcements WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      throw new NotFoundException('Announcement not found');
    }

    const res = await this.db.query(
      `UPDATE announcements
       SET title = COALESCE($1, title),
           body = COALESCE($2, body),
           type = COALESCE($3, type)
       WHERE id = $4
       RETURNING id, title, body, type, published_by, published_at`,
      [dto.title || null, dto.body || null, dto.type || null, id],
    );

    const updated = res.rows[0];

    await this.logAudit(userId, 'updated_announcement', id, {
      title: updated.title,
      type: updated.type,
      changes: dto,
    });

    return updated;
  }

  async deleteAnnouncement(id: string, userId: string) {
    const check = await this.db.query('SELECT id, title, type FROM announcements WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      throw new NotFoundException('Announcement not found');
    }

    const deleted = check.rows[0];

    await this.db.query('DELETE FROM announcements WHERE id = $1', [id]);

    await this.logAudit(userId, 'deleted_announcement', id, {
      title: deleted.title,
      type: deleted.type,
    });

    return {
      message: `Announcement "${deleted.title}" deleted successfully`,
      id,
    };
  }

  // System auto-creation for new published courses or system milestones
  async createAutoAnnouncement(
    publisherId: string,
    title: string,
    body: string,
    type: AnnouncementType = AnnouncementType.NEW_CONTENT,
  ) {
    const res = await this.db.query(
      `INSERT INTO announcements (title, body, type, published_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, body, type, published_by, published_at`,
      [title, body, type, publisherId],
    );
    return res.rows[0];
  }
}
