import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { AiGenerateQuestionsDto } from './dto/ai-generate-questions.dto';
import { GenerateFromPdfDto } from './dto/generate-from-pdf.dto';
import { UpdateAiDraftDto } from './dto/update-ai-draft.dto';
import { AiGeneratorService } from './ai-generator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssessmentsController {
  constructor(
    private assessmentsService: AssessmentsService,
    private aiGeneratorService: AiGeneratorService,
  ) {}

  @Post(['trainer/question-banks/generate-from-pdf', 'question-banks/generate-from-pdf'])
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
      fileFilter: (_req, file, callback) => {
        if (
          file.mimetype !== 'application/pdf' &&
          !file.originalname.toLowerCase().endsWith('.pdf')
        ) {
          callback(new BadRequestException('Only PDF files are supported.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Extract text from PDF lecture notes and generate 10-15 grounded MCQ drafts (saved as pending review)',
  })
  async generateFromPdf(
    @CurrentUser('id') trainerId: string,
    @CurrentUser('role') role: UserRole,
    @UploadedFile() file: any,
    @Body() dto: GenerateFromPdfDto,
  ) {
    return this.assessmentsService.generateFromPdf(trainerId, role, file, dto);
  }

  @Post('question-banks/:id/ai-drafts')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Store candidate drafts in question bank' })
  async storeAiDrafts(
    @Param('id') questionBankId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() body: { drafts: any[] },
  ) {
    return this.assessmentsService.storeAiDrafts(questionBankId, userId, role, body.drafts || []);
  }

  @Get('question-banks/:id/ai-drafts')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List pending AI drafts for review (Trainer/Admin only)' })
  async getAiDrafts(
    @Param('id') questionBankId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.getAiDrafts(questionBankId, userId, role);
  }

  @Patch('question-banks/:id/ai-drafts/:draftId')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Edit an AI draft question before approving' })
  async updateAiDraft(
    @Param('id') questionBankId: string,
    @Param('draftId') draftId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: UpdateAiDraftDto,
  ) {
    return this.assessmentsService.updateAiDraft(questionBankId, draftId, userId, role, dto);
  }

  @Delete('question-banks/:id/ai-drafts/:draftId')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject and delete an AI draft question' })
  async deleteAiDraft(
    @Param('id') questionBankId: string,
    @Param('draftId') draftId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.deleteAiDraft(questionBankId, draftId, userId, role);
  }

  @Post('question-banks/:id/ai-drafts/:draftId/regenerate')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Regenerate a single draft question using the source PDF content' })
  async regenerateAiDraft(
    @Param('id') questionBankId: string,
    @Param('draftId') draftId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.regenerateAiDraft(questionBankId, draftId, userId, role);
  }

  @Post('question-banks/:id/ai-drafts/:draftId/approve')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a single AI draft and publish to live questions' })
  async approveAiDraft(
    @Param('id') questionBankId: string,
    @Param('draftId') draftId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.approveAiDraft(questionBankId, draftId, userId, role);
  }

  @Post('question-banks/:id/ai-drafts/approve-all')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk approve all pending AI drafts into live questions table' })
  async approveAllAiDrafts(
    @Param('id') questionBankId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.approveAllAiDrafts(questionBankId, userId, role);
  }

  @Post('question-banks/ai-generate-questions')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Draft candidate MCQs from syllabus notes using AI/NLP (Trainer review required before saving to question bank)',
  })
  async generateAiQuestions(@Body() dto: AiGenerateQuestionsDto) {
    return this.aiGeneratorService.generateCandidateQuestions(dto);
  }

  @Post('question-banks')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new question bank for a course (Trainer-only)' })
  async createQuestionBank(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateQuestionBankDto,
  ) {
    return this.assessmentsService.createQuestionBank(userId, role, dto);
  }

  @Get('courses/:id/question-banks')
  @ApiOperation({ summary: 'List question banks for a course' })
  async getQuestionBanksByCourse(
    @Param('id') courseId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.getQuestionBanksByCourse(courseId, userId, role);
  }

  @Patch('question-banks/:id')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update question bank details and settings' })
  async updateQuestionBank(
    @Param('id') questionBankId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: UpdateQuestionBankDto,
  ) {
    return this.assessmentsService.updateQuestionBank(questionBankId, userId, role, dto);
  }

  @Post('question-banks/:id/questions')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a question to a question bank (Trainer-only)' })
  async addQuestion(
    @Param('id') questionBankId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.assessmentsService.addQuestion(questionBankId, userId, role, dto);
  }

  @Get('question-banks/:id/questions')
  @ApiOperation({
    summary:
      'Get questions for a question bank (Sanitized for trainees during active attempt; complete for trainers)',
  })
  async getQuestions(
    @Param('id') questionBankId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.getQuestions(questionBankId, userId, role);
  }

  @Delete('questions/:questionId')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a question from a question bank' })
  async deleteQuestion(
    @Param('questionId') questionId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.deleteQuestion(questionId, userId, role);
  }

  @Post('attempts/start')
  @Roles(UserRole.TRAINEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Start a timed quiz attempt for an enrolled course (Trainee)' })
  async startAttempt(
    @CurrentUser('id') traineeId: string,
    @Body('questionBankId') questionBankId: string,
  ) {
    return this.assessmentsService.startAttempt(questionBankId, traineeId);
  }

  @Post('attempts/:id/submit')
  @Roles(UserRole.TRAINEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit quiz answers and calculate auto-graded result' })
  async submitAttempt(
    @Param('id') attemptId: string,
    @CurrentUser('id') traineeId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.assessmentsService.submitAttempt(attemptId, traineeId, dto);
  }

  @Get('attempts/:id/result')
  @ApiOperation({ summary: 'Get attempt score, pass/fail status, and explanation breakdown' })
  async getResult(
    @Param('id') attemptId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.getResult(attemptId, userId, role);
  }

  @Get('courses/:id/attempts')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all trainee attempts and scores for a course (Trainer/Admin)' })
  async getCourseAttempts(
    @Param('id') courseId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assessmentsService.getCourseAttempts(courseId, userId, role);
  }

  @Get('courses/:id/my-attempts')
  @Roles(UserRole.TRAINEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current trainee attempts and scores for a course' })
  async getMyCourseAttempts(
    @Param('id') courseId: string,
    @CurrentUser('id') traineeId: string,
  ) {
    return this.assessmentsService.getMyCourseAttempts(courseId, traineeId);
  }
}
