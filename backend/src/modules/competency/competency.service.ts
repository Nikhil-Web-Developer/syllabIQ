import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { AssignUserSkillDto, ProficiencyLevel } from './dto/assign-user-skill.dto';

@Injectable()
export class CompetencyService implements OnModuleInit {
  private readonly logger = new Logger(CompetencyService.name);

  constructor(private db: DatabaseService) {}

  async onModuleInit() {
    await this.seedDefaultSkills();
  }

  private async seedDefaultSkills() {
    try {
      const skills = [
        // 1-10: Domain Skills (MoES Earth, Ocean & Climate Sciences)
        { name: 'Numerical Weather Prediction (NWP)', category: 'Domain' },
        { name: 'Doppler Weather Radar Meteorology', category: 'Domain' },
        { name: 'Ocean Circulation & Hydrodynamics', category: 'Domain' },
        { name: 'Seismology & Earthquake Early Warning', category: 'Domain' },
        { name: 'Deep Ocean Mission Technologies', category: 'Domain' },
        { name: 'Coastal Hazard & Tsunami Early Warning', category: 'Domain' },
        { name: 'Marine Biogeochemistry & Ecosystems', category: 'Domain' },
        { name: 'Polar & Cryospheric Science', category: 'Domain' },
        { name: 'Monsoon Dynamics & Climate Variability', category: 'Domain' },
        { name: 'Agrometeorology & Advisory Services', category: 'Domain' },

        // 11-18: Technical Skills
        { name: 'GIS & Satellite Remote Sensing', category: 'Technical' },
        { name: 'Scientific Python (NumPy, SciPy, Xarray)', category: 'Technical' },
        { name: 'High Performance Computing (HPC) & MPI', category: 'Technical' },
        { name: 'Climate Data Analysis & NetCDF', category: 'Technical' },
        { name: 'Machine Learning for Weather & Climate', category: 'Technical' },
        { name: 'Oceanographic Instrumentation & Calibration', category: 'Technical' },
        { name: 'Database Management & Spatial SQL', category: 'Technical' },
        { name: 'Cloud Computing for Geospatial Data', category: 'Technical' },

        // 19-22: Management & Governance Skills
        { name: 'Disaster Risk Reduction & Management', category: 'Management' },
        { name: 'Project Management & Budgeting', category: 'Management' },
        { name: 'Government Procurement & GeM Portal', category: 'Management' },
        { name: 'Quality Management & ISO Standards', category: 'Management' },

        // 23-25: Soft Skills
        { name: 'Scientific Writing & Publishing', category: 'Soft Skill' },
        { name: 'Public Speaking & Scientific Communication', category: 'Soft Skill' },
        { name: 'Crisis Leadership & Command Operations', category: 'Soft Skill' },
      ];

      for (const s of skills) {
        await this.db.query(
          'INSERT INTO skills (name, category) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [s.name, s.category],
        );
      }
      this.logger.log('Seeded comprehensive 25-item skills taxonomy for MoES');
    } catch (e) {
      this.logger.warn(`Skill seed check skipped: ${(e as Error).message}`);
    }
  }

  async getAllSkills(category?: string) {
    if (category) {
      const res = await this.db.query(
        'SELECT id, name, category FROM skills WHERE category ILIKE $1 ORDER BY name ASC',
        [category],
      );
      return res.rows;
    }
    const res = await this.db.query(
      'SELECT id, name, category FROM skills ORDER BY category, name ASC',
    );
    return res.rows;
  }

  async createSkill(dto: CreateSkillDto) {
    const existing = await this.db.query('SELECT id FROM skills WHERE name = $1', [dto.name]);
    if (existing.rows.length > 0) {
      throw new ConflictException('Skill already exists in taxonomy');
    }

    const res = await this.db.query(
      'INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING id, name, category',
      [dto.name, dto.category],
    );

    return res.rows[0];
  }

  async assignUserSkill(userId: string, dto: AssignUserSkillDto) {
    const skillRes = await this.db.query('SELECT id, name, category FROM skills WHERE id = $1', [dto.skillId]);
    if (skillRes.rows.length === 0) {
      throw new NotFoundException('Skill not found in taxonomy');
    }

    const skill = skillRes.rows[0];

    const res = await this.db.query(
      `INSERT INTO user_skills (user_id, skill_id, proficiency_level, source)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, skill_id) DO UPDATE
       SET proficiency_level = $3, source = $4
       RETURNING id, user_id, skill_id, proficiency_level, source`,
      [userId, dto.skillId, dto.proficiencyLevel, dto.source],
    );

    return {
      ...res.rows[0],
      name: skill.name,
      category: skill.category,
    };
  }

  async deleteUserSkill(userId: string, skillId: string) {
    const res = await this.db.query(
      'DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2 RETURNING id',
      [userId, skillId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Skill is not tagged on user profile');
    }

    return {
      message: 'Skill removed successfully from user profile',
      skillId,
    };
  }

  /**
   * Section 6 Trainer-Matching Algorithm:
   * score(trainer, course) =
   *     (trainer_proficiency_level_weight)       × 0.5
   *   + (years_experience_normalized)            × 0.2
   *   + (avg_past_course_rating_for_this_skill)  × 0.2
   *   + (number_of_prior_courses_taught_in_skill)× 0.1
   */
  async matchTrainers(params: { courseId?: string; skillId?: string }) {
    let skillId = params.skillId;
    let courseInfo: {
      id: string;
      title: string;
      trainerId?: string;
      trainerName?: string;
    } | null = null;

    let skillInfo: {
      id: string;
      name: string;
      category: string;
    } | null = null;

    // 1. Resolve Target Skill and Course metadata if courseId is passed
    if (params.courseId) {
      const courseRes = await this.db.query(
        `SELECT c.id, c.title, c.subject_skill_id, c.trainer_id,
                u.name as trainer_name, s.name as skill_name, s.category as skill_category
         FROM courses c
         LEFT JOIN users u ON u.id = c.trainer_id
         LEFT JOIN skills s ON s.id = c.subject_skill_id
         WHERE c.id = $1`,
        [params.courseId],
      );

      if (courseRes.rows.length === 0) {
        throw new NotFoundException('Course not found');
      }

      const course = courseRes.rows[0];
      if (!course.subject_skill_id) {
        throw new BadRequestException('Course does not have an assigned subject skill tag for matching');
      }

      skillId = course.subject_skill_id;
      courseInfo = {
        id: course.id,
        title: course.title,
        trainerId: course.trainer_id || undefined,
        trainerName: course.trainer_name || undefined,
      };
      skillInfo = {
        id: course.subject_skill_id,
        name: course.skill_name || 'Subject Skill',
        category: course.skill_category || 'Domain',
      };
    } else if (skillId) {
      const skillRes = await this.db.query(
        'SELECT id, name, category FROM skills WHERE id = $1',
        [skillId],
      );

      if (skillRes.rows.length === 0) {
        throw new NotFoundException('Skill not found in taxonomy');
      }

      skillInfo = skillRes.rows[0];
    } else {
      throw new BadRequestException('Either course_id or skill_id query parameter must be provided');
    }

    // 2. Query all approved trainers tagged with this skill in user_skills
    const query = `
      SELECT
        u.id as trainer_id,
        u.name as trainer_name,
        u.email as trainer_email,
        COALESCE(tp.years_experience, 0) as years_experience,
        tp.bio,
        us.proficiency_level,
        us.source as skill_source,
        COALESCE(course_stats.prior_courses_in_skill, 0) as prior_courses_in_skill,
        COALESCE(feedback_stats.avg_rating_in_skill, 0) as avg_rating_in_skill,
        COALESCE(feedback_stats.rating_count, 0) as rating_count
      FROM users u
      INNER JOIN user_skills us ON us.user_id = u.id AND us.skill_id = $1
      LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
      LEFT JOIN (
        SELECT 
          c.trainer_id,
          COUNT(c.id) as prior_courses_in_skill
        FROM courses c
        WHERE c.subject_skill_id = $1
        GROUP BY c.trainer_id
      ) course_stats ON course_stats.trainer_id = u.id
      LEFT JOIN (
        SELECT 
          c.trainer_id,
          AVG(f.rating) as avg_rating_in_skill,
          COUNT(f.id) as rating_count
        FROM courses c
        INNER JOIN feedback f ON f.course_id = c.id
        WHERE c.subject_skill_id = $1
        GROUP BY c.trainer_id
      ) feedback_stats ON feedback_stats.trainer_id = u.id
      WHERE u.role = 'trainer' AND u.status = 'approved'
    `;

    const trainersRes = await this.db.query(query, [skillId]);
    const rawTrainers = trainersRes.rows;

    if (rawTrainers.length === 0) {
      return {
        skill: skillInfo,
        course: courseInfo,
        trainers: [],
        totalMatches: 0,
        message: 'No approved trainers have tagged this skill yet',
      };
    }

    // Calculate max prior courses for normalization (across candidate trainers)
    const maxPriorCourses = Math.max(
      ...rawTrainers.map((t) => Number(t.prior_courses_in_skill || 0)),
    );

    // Standard Section 6 proficiency weights
    const proficiencyWeights: Record<string, number> = {
      [ProficiencyLevel.BEGINNER]: 0.25,
      [ProficiencyLevel.INTERMEDIATE]: 0.5,
      [ProficiencyLevel.ADVANCED]: 0.75,
      [ProficiencyLevel.EXPERT]: 1.0,
    };

    const rankedTrainers = rawTrainers.map((t) => {
      // 1. Proficiency Weight (0.25, 0.5, 0.75, 1.0)
      const profWeight = proficiencyWeights[t.proficiency_level] || 0.25;

      // 2. Years experience normalized: min(years / 10, 1.0)
      const rawExp = Number(t.years_experience) || 0;
      const expNorm = Math.min(rawExp / 10.0, 1.0);

      // 3. Avg past course rating normalized: (rating / 5.0), 0.0 if no rating
      const rawAvgRating = Number(t.avg_rating_in_skill) || 0;
      const ratingNorm = rawAvgRating > 0 ? rawAvgRating / 5.0 : 0.0;

      // 4. Number of prior courses normalized
      const rawPriorCourses = Number(t.prior_courses_in_skill) || 0;
      const coursesNorm = maxPriorCourses > 0 ? rawPriorCourses / maxPriorCourses : 0.0;

      // Composite calculation (weighted sum)
      const score =
        profWeight * 0.5 +
        expNorm * 0.2 +
        ratingNorm * 0.2 +
        coursesNorm * 0.1;

      // Rounded to 3 decimal places
      const finalScore = Number(score.toFixed(3));

      return {
        trainerId: t.trainer_id,
        trainerName: t.trainer_name,
        trainerEmail: t.trainer_email,
        bio: t.bio,
        yearsExperience: rawExp,
        proficiencyLevel: t.proficiency_level,
        skillSource: t.skill_source,
        priorCoursesCount: rawPriorCourses,
        avgRating: Number(rawAvgRating.toFixed(2)),
        ratingCount: Number(t.rating_count) || 0,
        score: finalScore,
        scorePercentage: Number((finalScore * 100).toFixed(1)),
        breakdown: {
          proficiencyScore: Number((profWeight * 0.5).toFixed(3)),
          experienceScore: Number((expNorm * 0.2).toFixed(3)),
          ratingScore: Number((ratingNorm * 0.2).toFixed(3)),
          coursesScore: Number((coursesNorm * 0.1).toFixed(3)),
        },
        scoreBreakdown: {
          proficiencyLevelWeight: Number(profWeight.toFixed(3)),
          proficiencyWeighted: Number((profWeight * 0.5).toFixed(3)),
          yearsExperienceNormalized: Number(expNorm.toFixed(3)),
          yearsExperienceWeighted: Number((expNorm * 0.2).toFixed(3)),
          avgRatingNormalized: Number(ratingNorm.toFixed(3)),
          avgRatingWeighted: Number((ratingNorm * 0.2).toFixed(3)),
          priorCoursesNormalized: Number(coursesNorm.toFixed(3)),
          priorCoursesWeighted: Number((coursesNorm * 0.1).toFixed(3)),
        },
      };
    });

    // Sort descending by score; secondary sort by yearsExperience, then priorCoursesCount
    rankedTrainers.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.yearsExperience !== a.yearsExperience) {
        return b.yearsExperience - a.yearsExperience;
      }
      return b.priorCoursesCount - a.priorCoursesCount;
    });

    return {
      skill: skillInfo,
      course: courseInfo,
      trainers: rankedTrainers,
      totalMatches: rankedTrainers.length,
    };
  }
}
