import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { UserRole } from '../../common/enums/role.enum';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AdminService {
  constructor(private db: DatabaseService) {}

  async logAudit(actorId: string, action: string, targetId?: string, metadata?: any) {
    try {
      await this.db.query(
        `INSERT INTO audit_logs (actor_id, action, target_id, metadata)
         VALUES ($1, $2, $3, $4)`,
        [actorId, action, targetId || null, metadata ? JSON.stringify(metadata) : '{}'],
      );
    } catch {
      // Non-blocking
    }
  }

  async getUsers(status?: string, role?: string, search?: string) {
    let sql = `
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at,
             CASE
               WHEN u.role = 'trainee' THEN tp.bio
               WHEN u.role = 'trainer' THEN trp.bio
               ELSE NULL
             END as bio,
             trp.years_experience
      FROM users u
      LEFT JOIN trainee_profiles tp ON tp.user_id = u.id
      LEFT JOIN trainer_profiles trp ON trp.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND u.status = $${params.length}`;
    }

    if (role) {
      params.push(role);
      sql += ` AND u.role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    sql += ' ORDER BY u.created_at DESC';

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async approveUser(userId: string, adminId: string) {
    const res = await this.db.query(
      `UPDATE users
       SET status = 'approved', updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, status`,
      [userId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    await this.logAudit(adminId, 'approved_user', userId, { targetEmail: res.rows[0].email, role: res.rows[0].role });

    return {
      message: `User ${res.rows[0].name} has been approved`,
      user: res.rows[0],
    };
  }

  async rejectUser(userId: string, adminId: string, reason?: string) {
    const res = await this.db.query(
      `UPDATE users
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, status`,
      [userId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    await this.logAudit(adminId, 'rejected_user', userId, { reason, targetEmail: res.rows[0].email });

    return {
      message: `User ${res.rows[0].name} registration was rejected`,
      user: res.rows[0],
    };
  }

  async updateUserRole(userId: string, adminId: string, newRole: UserRole) {
    const res = await this.db.query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, status`,
      [newRole, userId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    // Ensure corresponding profile exists
    if (newRole === UserRole.TRAINER) {
      await this.db.query(
        `INSERT INTO trainer_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [userId],
      );
    } else if (newRole === UserRole.TRAINEE) {
      await this.db.query(
        `INSERT INTO trainee_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [userId],
      );
    }

    await this.logAudit(adminId, 'updated_user_role', userId, { newRole });

    return {
      message: `User role updated to ${newRole}`,
      user: res.rows[0],
    };
  }

  async getDashboardEnrollments(from?: string, to?: string) {
    const params = [from || null, to || null];

    // 1. Summary & Status Breakdown
    const totalRes = await this.db.query(
      `SELECT
        COUNT(*)::int as total_enrollments,
        COUNT(*) FILTER (WHERE e.status = 'active')::int as active_enrollments,
        COUNT(*) FILTER (WHERE e.status = 'completed')::int as completed_enrollments,
        COUNT(*) FILTER (WHERE e.status = 'dropped')::int as dropped_enrollments,
        COALESCE(AVG(e.progress_percent), 0)::float as avg_progress_percent
      FROM enrollments e
      WHERE ($1::timestamptz IS NULL OR e.enrolled_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR e.enrolled_at <= $2::timestamptz)`,
      params,
    );

    const summaryRow = totalRes.rows[0] || {
      total_enrollments: 0,
      active_enrollments: 0,
      completed_enrollments: 0,
      dropped_enrollments: 0,
      avg_progress_percent: 0,
    };

    // 2. Enrollments Over Time (Daily/Weekly Trend)
    const trendRes = await this.db.query(
      `SELECT
        TO_CHAR(DATE_TRUNC('day', e.enrolled_at), 'YYYY-MM-DD') as bucket,
        COUNT(*)::int as count
      FROM enrollments e
      WHERE ($1::timestamptz IS NULL OR e.enrolled_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR e.enrolled_at <= $2::timestamptz)
      GROUP BY DATE_TRUNC('day', e.enrolled_at)
      ORDER BY bucket ASC`,
      params,
    );

    // 3. Enrollments by Course
    const byCourseRes = await this.db.query(
      `SELECT
        c.id as course_id,
        c.title as course_title,
        COUNT(e.id)::int as enrollment_count,
        COUNT(e.id) FILTER (WHERE e.status = 'completed')::int as completed_count
      FROM courses c
      JOIN enrollments e ON e.course_id = c.id
      WHERE ($1::timestamptz IS NULL OR e.enrolled_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR e.enrolled_at <= $2::timestamptz)
      GROUP BY c.id, c.title
      ORDER BY enrollment_count DESC`,
      params,
    );

    return {
      total_enrollments: summaryRow.total_enrollments,
      enrollments_over_time: trendRes.rows,
      enrollments_by_course: byCourseRes.rows,
      breakdown: {
        active: summaryRow.active_enrollments,
        completed: summaryRow.completed_enrollments,
        dropped: summaryRow.dropped_enrollments,
        avg_progress_percent: Math.round(summaryRow.avg_progress_percent * 10) / 10,
      },
      summary: summaryRow,
      trend: trendRes.rows,
    };
  }

  async getDashboardCertifications(from?: string, to?: string) {
    const params = [from || null, to || null];

    // 1. Overall Certification Totals
    const totalRes = await this.db.query(
      `SELECT
        COUNT(*)::int as total_certificates_issued,
        COUNT(DISTINCT cert.user_id)::int as unique_certified_trainees,
        COUNT(DISTINCT cert.course_id)::int as certified_courses_count
      FROM certificates cert
      WHERE ($1::timestamptz IS NULL OR cert.created_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR cert.created_at <= $2::timestamptz)`,
      params,
    );

    const summaryRow = totalRes.rows[0] || {
      total_certificates_issued: 0,
      unique_certified_trainees: 0,
      certified_courses_count: 0,
    };

    // 2. Issuance Over Time Trend
    const trendRes = await this.db.query(
      `SELECT
        TO_CHAR(DATE_TRUNC('day', cert.created_at), 'YYYY-MM-DD') as bucket,
        COUNT(*)::int as count
      FROM certificates cert
      WHERE ($1::timestamptz IS NULL OR cert.created_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR cert.created_at <= $2::timestamptz)
      GROUP BY DATE_TRUNC('day', cert.created_at)
      ORDER BY bucket ASC`,
      params,
    );

    // 3. Top Courses by Certification Count
    const byCourseRes = await this.db.query(
      `SELECT
        COALESCE(c.id, '00000000-0000-0000-0000-000000000000'::uuid) as course_id,
        COALESCE(c.title, cert.title, 'External / Special Certification') as course_title,
        COUNT(cert.id)::int as count
      FROM certificates cert
      LEFT JOIN courses c ON cert.course_id = c.id
      WHERE ($1::timestamptz IS NULL OR cert.created_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR cert.created_at <= $2::timestamptz)
      GROUP BY c.id, c.title, cert.title
      ORDER BY count DESC
      LIMIT 10`,
      params,
    );

    return {
      total_certificates: summaryRow.total_certificates_issued,
      issuance_over_time: trendRes.rows,
      top_courses: byCourseRes.rows,
      summary: summaryRow,
      byCourse: byCourseRes.rows,
    };
  }

  async getDashboardAssessments(from?: string, to?: string) {
    const params = [from || null, to || null];

    // 1. Overall Attempts & Pass Rate
    const totalRes = await this.db.query(
      `SELECT
        COUNT(*)::int as total_attempts,
        COUNT(*) FILTER (WHERE aa.passed = true)::int as passed_attempts,
        COUNT(*) FILTER (WHERE aa.passed = false)::int as failed_attempts,
        COALESCE(AVG(aa.score), 0)::float as avg_score,
        CASE
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE aa.passed = true)::numeric / COUNT(*)::numeric) * 100, 1)::float
          ELSE 0::float
        END as overall_pass_rate
      FROM assessment_attempts aa
      WHERE aa.submitted_at IS NOT NULL
        AND ($1::timestamptz IS NULL OR aa.submitted_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR aa.submitted_at <= $2::timestamptz)`,
      params,
    );

    const summaryRow = totalRes.rows[0] || {
      total_attempts: 0,
      passed_attempts: 0,
      failed_attempts: 0,
      avg_score: 0,
      overall_pass_rate: 0,
    };

    // 2. Pass/Fail Breakdown by Course and Question Bank
    const byBankRes = await this.db.query(
      `SELECT
        c.id as course_id,
        c.title as course_title,
        qb.id as question_bank_id,
        qb.title as question_bank_title,
        qb.id as id,
        qb.title as title,
        COUNT(aa.id)::int as attempt_count,
        COUNT(aa.id) FILTER (WHERE aa.passed = true)::int as passed_count,
        COUNT(aa.id) FILTER (WHERE aa.passed = false)::int as failed_count,
        COALESCE(AVG(aa.score), 0)::float as avg_score,
        CASE
          WHEN COUNT(aa.id) > 0 THEN ROUND((COUNT(aa.id) FILTER (WHERE aa.passed = true)::numeric / COUNT(aa.id)::numeric) * 100, 1)::float
          ELSE 0::float
        END as pass_rate
      FROM question_banks qb
      JOIN courses c ON qb.course_id = c.id
      LEFT JOIN assessment_attempts aa ON aa.question_bank_id = qb.id
        AND aa.submitted_at IS NOT NULL
        AND ($1::timestamptz IS NULL OR aa.submitted_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR aa.submitted_at <= $2::timestamptz)
      GROUP BY c.id, c.title, qb.id, qb.title
      ORDER BY attempt_count DESC, c.title ASC`,
      params,
    );

    // 3. Average Score by Subject Skill (assessment_attempts -> question_banks -> courses -> skills)
    const bySkillRes = await this.db.query(
      `SELECT
        s.id as skill_id,
        s.name as skill_name,
        s.category as skill_category,
        COUNT(aa.id)::int as attempt_count,
        COALESCE(AVG(aa.score), 0)::float as avg_score,
        CASE
          WHEN COUNT(aa.id) > 0 THEN ROUND((COUNT(aa.id) FILTER (WHERE aa.passed = true)::numeric / COUNT(aa.id)::numeric) * 100, 1)::float
          ELSE 0::float
        END as pass_rate
      FROM skills s
      JOIN courses c ON c.subject_skill_id = s.id
      JOIN question_banks qb ON qb.course_id = c.id
      JOIN assessment_attempts aa ON aa.question_bank_id = qb.id AND aa.submitted_at IS NOT NULL
      WHERE ($1::timestamptz IS NULL OR aa.submitted_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR aa.submitted_at <= $2::timestamptz)
      GROUP BY s.id, s.name, s.category
      ORDER BY avg_score DESC`,
      params,
    );

    return {
      overall_pass_rate: summaryRow.overall_pass_rate,
      total_attempts: summaryRow.total_attempts,
      passed_attempts: summaryRow.passed_attempts,
      failed_attempts: summaryRow.failed_attempts,
      avg_score: Math.round(summaryRow.avg_score * 10) / 10,
      by_course: byBankRes.rows,
      by_subject_skill: bySkillRes.rows,
      summary: summaryRow,
      byQuestionBank: byBankRes.rows,
    };
  }

  async getDashboardParticipation(from?: string, to?: string) {
    const params = [from || null, to || null];

    // 1. Total User Counts & Active Users
    const userStats = await this.db.query(
      `SELECT
        COUNT(*)::int as total_users,
        COUNT(*) FILTER (WHERE role = 'trainee')::int as trainee_count,
        COUNT(*) FILTER (WHERE role = 'trainer')::int as trainer_count,
        COUNT(*) FILTER (WHERE role = 'admin')::int as admin_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending_approval_count,
        COUNT(*) FILTER (WHERE status = 'approved')::int as approved_count,
        (
          SELECT COUNT(DISTINCT u.id)::int
          FROM users u
          WHERE u.status = 'approved'
            AND (
              ($1::timestamptz IS NOT NULL AND u.updated_at >= $1::timestamptz)
              OR ($1::timestamptz IS NULL AND u.updated_at >= NOW() - INTERVAL '30 days')
              OR EXISTS (
                SELECT 1 FROM enrollments e
                WHERE e.trainee_id = u.id
                  AND ($1::timestamptz IS NULL OR e.enrolled_at >= $1::timestamptz)
                  AND ($2::timestamptz IS NULL OR e.enrolled_at <= $2::timestamptz)
              )
            )
        ) as active_user_count
      FROM users`,
      params,
    );

    const userRow = userStats.rows[0] || {
      total_users: 0,
      trainee_count: 0,
      trainer_count: 0,
      admin_count: 0,
      pending_approval_count: 0,
      approved_count: 0,
      active_user_count: 0,
    };

    // 2. Most Active Courses (Enrollments + Completions combined)
    const activeCoursesRes = await this.db.query(
      `SELECT
        c.id as course_id,
        c.title as course_title,
        u.name as trainer_name,
        s.name as skill_name,
        COUNT(e.id)::int as total_enrollments,
        COUNT(e.id) FILTER (WHERE e.status = 'completed')::int as total_completions,
        (COUNT(e.id) + COUNT(e.id) FILTER (WHERE e.status = 'completed'))::int as activity_score
      FROM courses c
      JOIN users u ON c.trainer_id = u.id
      LEFT JOIN skills s ON c.subject_skill_id = s.id
      LEFT JOIN enrollments e ON e.course_id = c.id
        AND ($1::timestamptz IS NULL OR e.enrolled_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR e.enrolled_at <= $2::timestamptz)
      GROUP BY c.id, c.title, u.name, s.name
      ORDER BY activity_score DESC, total_enrollments DESC
      LIMIT 10`,
      params,
    );

    // 3. Org-Wide Skill-Gap Heatmap (Section 10.6)
    const skillGapRes = await this.db.query(`
      SELECT
        s.category,
        COUNT(*) FILTER (WHERE us.proficiency_level = 'beginner')::int as beginner,
        COUNT(*) FILTER (WHERE us.proficiency_level = 'intermediate')::int as intermediate,
        COUNT(*) FILTER (WHERE us.proficiency_level = 'advanced')::int as advanced,
        COUNT(*) FILTER (WHERE us.proficiency_level = 'expert')::int as expert,
        COUNT(us.id)::int as total_tagged
      FROM skills s
      LEFT JOIN user_skills us ON us.skill_id = s.id
      GROUP BY s.category
      ORDER BY total_tagged DESC
    `);

    return {
      total_users: userRow.total_users,
      active_user_count: userRow.active_user_count,
      trainee_count: userRow.trainee_count,
      trainer_count: userRow.trainer_count,
      admin_count: userRow.admin_count,
      pending_approval_count: userRow.pending_approval_count,
      approved_count: userRow.approved_count,
      most_active_courses: activeCoursesRes.rows,
      skill_gap_heatmap: skillGapRes.rows,
      userCounts: {
        total_users: userRow.total_users,
        total_trainees: userRow.trainee_count,
        total_trainers: userRow.trainer_count,
        total_admins: userRow.admin_count,
        pending_approvals: userRow.pending_approval_count,
        active_approved: userRow.approved_count,
      },
    };
  }

  async getAuditLogs(query?: AuditLogQueryDto) {
    let sql = `
      SELECT al.id, al.action, al.target_id, al.metadata, al.created_at,
             u.name as actor_name, u.email as actor_email, u.role as actor_role
      FROM audit_logs al
      JOIN users u ON al.actor_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query?.action) {
      params.push(query.action);
      sql += ` AND al.action = $${params.length}`;
    }

    if (query?.actor) {
      params.push(`%${query.actor}%`);
      sql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    if (query?.from) {
      params.push(query.from);
      sql += ` AND al.created_at >= $${params.length}::timestamptz`;
    }

    if (query?.to) {
      params.push(query.to);
      sql += ` AND al.created_at <= $${params.length}::timestamptz`;
    }

    sql += ` ORDER BY al.created_at DESC`;

    const limit = query?.limit ? Number(query.limit) : 50;
    const offset = query?.offset ? Number(query.offset) : 0;

    params.push(limit);
    sql += ` LIMIT $${params.length}`;

    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async assignCourseTrainer(courseId: string, trainerId: string, adminId: string) {
    // 1. Verify course exists
    const courseRes = await this.db.query(
      'SELECT id, title, trainer_id, subject_skill_id FROM courses WHERE id = $1',
      [courseId],
    );

    if (courseRes.rows.length === 0) {
      throw new NotFoundException('Course not found');
    }

    const course = courseRes.rows[0];

    // 2. Verify trainer exists and is approved trainer
    const trainerRes = await this.db.query(
      "SELECT id, name, email, role, status FROM users WHERE id = $1 AND role = 'trainer'",
      [trainerId],
    );

    if (trainerRes.rows.length === 0) {
      throw new BadRequestException('Target user is not a valid trainer');
    }

    const trainer = trainerRes.rows[0];
    if (trainer.status !== 'approved') {
      throw new BadRequestException('Cannot assign course to a non-approved trainer');
    }

    const previousTrainerId = course.trainer_id;

    // 3. Update course's trainer_id
    const updateRes = await this.db.query(
      `UPDATE courses
       SET trainer_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, trainer_id, subject_skill_id, difficulty, status, updated_at`,
      [trainerId, courseId],
    );

    // 4. Record in audit trail
    await this.logAudit(adminId, 'assigned_trainer', courseId, {
      courseTitle: course.title,
      previousTrainerId,
      newTrainerId: trainerId,
      trainerName: trainer.name,
      trainerEmail: trainer.email,
    });

    return {
      message: `Course "${course.title}" successfully assigned to ${trainer.name}`,
      course: {
        ...updateRes.rows[0],
        trainer_name: trainer.name,
        trainer_email: trainer.email,
      },
    };
  }
}
