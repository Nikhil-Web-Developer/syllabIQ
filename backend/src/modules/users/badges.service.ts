import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface BadgeDefinition {
  code: string;
  title: string;
  description: string;
  icon: string;
  criteria: string;
  category: string;
}

const DEFAULT_BADGES: BadgeDefinition[] = [
  {
    code: 'pioneer_learner',
    title: 'Pioneer Learner',
    description: 'Successfully completed your first MoES capacity building training module.',
    icon: 'Sparkles',
    criteria: 'Completed 1 Course',
    category: 'milestone',
  },
  {
    code: 'mastery_achiever',
    title: 'Mastery Achiever',
    description: 'Completed 3 or more advanced scientific training courses across Ministry divisions.',
    icon: 'Award',
    criteria: 'Completed 3 Courses',
    category: 'milestone',
  },
  {
    code: 'precision_scholar',
    title: 'Precision Scholar',
    description: 'Achieved a perfect 100% score on a formal course assessment quiz.',
    icon: 'CheckCircle2',
    criteria: 'Scored 100% on Assessment',
    category: 'academic',
  },
  {
    code: 'atmospheric_specialist',
    title: 'Atmospheric Sciences Specialist',
    description: 'Earned specialized competence in Numerical Weather Prediction and Radar Meteorology.',
    icon: 'CloudRain',
    criteria: 'Atmospheric Domain Course Completed',
    category: 'domain',
  },
  {
    code: 'ocean_specialist',
    title: 'Ocean Systems Specialist',
    description: 'Earned specialized competence in Ocean Dynamics and Early Warning Systems.',
    icon: 'Waves',
    criteria: 'Oceanography Domain Course Completed',
    category: 'domain',
  },
  {
    code: 'fast_track',
    title: 'Fast Track Achiever',
    description: 'Successfully passed an assessment attempt in record time.',
    icon: 'Zap',
    criteria: 'Rapid Assessment Completion',
    category: 'academic',
  },
];

@Injectable()
export class BadgesService implements OnModuleInit {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    await this.seedDefaultBadges();
  }

  private async seedDefaultBadges() {
    for (const b of DEFAULT_BADGES) {
      try {
        await this.db.query(
          `INSERT INTO badges (code, title, description, icon, criteria, category)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (code) DO NOTHING`,
          [b.code, b.title, b.description, b.icon, b.criteria, b.category],
        );
      } catch (err) {
        this.logger.debug(`Badge seed for ${b.code} processed`);
      }
    }
  }

  async getAllBadges() {
    const res = await this.db.query(
      `SELECT id, code, title, description, icon, criteria, category, created_at FROM badges ORDER BY created_at ASC`,
    );
    return res.rows;
  }

  async getUserBadges(userId: string) {
    const res = await this.db.query(
      `SELECT b.id, b.code, b.title, b.description, b.icon, b.criteria, b.category,
              ub.awarded_at, ub.metadata
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1
       ORDER BY ub.awarded_at DESC`,
      [userId],
    );
    return res.rows;
  }

  async awardBadge(userId: string, badgeCode: string, metadata: any = {}) {
    const badgeRes = await this.db.query(
      `SELECT id, code, title FROM badges WHERE code = $1`,
      [badgeCode],
    );
    if (badgeRes.rows.length === 0) return null;

    const badge = badgeRes.rows[0];

    try {
      const res = await this.db.query(
        `INSERT INTO user_badges (user_id, badge_id, awarded_at, metadata)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (user_id, badge_id) DO NOTHING
         RETURNING id, user_id, badge_id, awarded_at, metadata`,
        [userId, badge.id, JSON.stringify(metadata)],
      );

      if (res.rows.length > 0) {
        this.logger.log(`Awarded badge [${badge.title}] to user [${userId}]`);
        return {
          ...res.rows[0],
          badge,
        };
      }
    } catch (err) {
      this.logger.error(`Failed awarding badge ${badgeCode} to ${userId}`, err);
    }
    return null;
  }

  async evaluateMilestones(
    userId: string,
    context?: { score?: number; courseId?: string; category?: string; durationMinutes?: number },
  ) {
    const awarded: any[] = [];

    // 1. Check Precision Scholar (100% score)
    if (context?.score !== undefined && Number(context.score) >= 100) {
      const b = await this.awardBadge(userId, 'precision_scholar', { score: context.score });
      if (b) awarded.push(b);
    }

    // 2. Check Course Completion counts
    const completedRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM enrollments WHERE trainee_id = $1 AND status = 'completed'`,
      [userId],
    );
    const count = completedRes.rows[0]?.count || 0;

    if (count >= 1) {
      const b = await this.awardBadge(userId, 'pioneer_learner', { totalCompleted: count });
      if (b) awarded.push(b);
    }

    if (count >= 3) {
      const b = await this.awardBadge(userId, 'mastery_achiever', { totalCompleted: count });
      if (b) awarded.push(b);
    }

    // 3. Domain Specialists
    if (context?.category) {
      const catLower = context.category.toLowerCase();
      if (catLower.includes('atmospher') || catLower.includes('meteorolog') || catLower.includes('weather')) {
        const b = await this.awardBadge(userId, 'atmospheric_specialist', { category: context.category });
        if (b) awarded.push(b);
      } else if (catLower.includes('ocean') || catLower.includes('marine') || catLower.includes('tsunami')) {
        const b = await this.awardBadge(userId, 'ocean_specialist', { category: context.category });
        if (b) awarded.push(b);
      }
    }

    return awarded;
  }
}
