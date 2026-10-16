import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CompetencyService } from './competency.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { AssignUserSkillDto } from './dto/assign-user-skill.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Skills & Competency')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CompetencyController {
  constructor(private competencyService: CompetencyService) {}

  @Public()
  @Get('skills')
  @ApiOperation({ summary: 'Get all skills from controlled taxonomy (filterable by category)' })
  @ApiQuery({ name: 'category', required: false, example: 'Technical' })
  async getAllSkills(@Query('category') category?: string) {
    return this.competencyService.getAllSkills(category);
  }

  @ApiBearerAuth()
  @Post('admin/skills')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new skill in taxonomy (Admin only)' })
  async createSkillAdmin(@Body() dto: CreateSkillDto) {
    return this.competencyService.createSkill(dto);
  }

  @ApiBearerAuth()
  @Post('skills')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new skill in taxonomy (Admin only alias)' })
  async createSkill(@Body() dto: CreateSkillDto) {
    return this.competencyService.createSkill(dto);
  }

  @ApiBearerAuth()
  @Post('users/me/skills')
  @ApiOperation({ summary: 'Tag a skill to current user profile (Trainee or Trainer)' })
  async assignUserSkill(
    @CurrentUser('id') userId: string,
    @Body() dto: AssignUserSkillDto,
  ) {
    return this.competencyService.assignUserSkill(userId, dto);
  }

  @ApiBearerAuth()
  @Delete('users/me/skills/:skillId')
  @ApiOperation({ summary: 'Remove a tagged skill from current user profile' })
  async deleteUserSkill(
    @CurrentUser('id') userId: string,
    @Param('skillId') skillId: string,
  ) {
    return this.competencyService.deleteUserSkill(userId, skillId);
  }

  @ApiBearerAuth()
  @Get('admin/competency/match')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Run competency-based trainer matching algorithm for a course or raw skill' })
  @ApiQuery({ name: 'course_id', required: false, description: 'Course ID to match trainers for' })
  @ApiQuery({ name: 'skill_id', required: false, description: 'Raw skill ID to match trainers for' })
  async matchTrainers(
    @Query('course_id') courseId?: string,
    @Query('skill_id') skillId?: string,
    @Query('courseId') cId?: string,
    @Query('skillId') sId?: string,
  ) {
    return this.competencyService.matchTrainers({
      courseId: courseId || cId,
      skillId: skillId || sId,
    });
  }
}
