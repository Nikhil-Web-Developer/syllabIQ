import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiGenerateQuestionsDto } from './dto/ai-generate-questions.dto';

export interface CandidateQuestion {
  tempId: string;
  text: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  suggestedDifficulty: string;
}

@Injectable()
export class AiGeneratorService {
  private readonly logger = new Logger(AiGeneratorService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Drafts candidate multiple-choice questions from provided lecture notes or content.
   * Leverages Google Gemini API if configured; otherwise seamlessly falls back to
   * the local grounded NLP heuristic engine.
   * NOTE: Candidate questions are returned solely for Trainer review and editing;
   * unreviewed AI output is NEVER auto-published directly into a live question bank.
   */
  async generateCandidateQuestions(dto: AiGenerateQuestionsDto): Promise<{
    sourceLength: number;
    generatedCount: number;
    candidateQuestions: CandidateQuestion[];
  }> {
    const content = dto.content.trim();
    const count = dto.count || 3;
    const difficulty = dto.difficulty || 'intermediate';

    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const geminiResult = await this.generateWithGemini(
          content,
          count,
          difficulty,
          apiKey,
        );
        if (geminiResult && geminiResult.length > 0) {
          this.logger.log(
            `Successfully generated ${geminiResult.length} candidate questions via Google Gemini API`,
          );
          return {
            sourceLength: content.length,
            generatedCount: geminiResult.length,
            candidateQuestions: geminiResult,
          };
        }
      } catch (err: any) {
        this.logger.warn(
          `Gemini API generation error (${err?.message}). Falling back to local NLP generator.`,
        );
      }
    }

    return this.generateLocally(content, count, difficulty);
  }

  /**
   * Generates candidate questions using Google Gemini API.
   */
  private async generateWithGemini(
    content: string,
    count: number,
    difficulty: string,
    apiKey: string,
  ): Promise<CandidateQuestion[] | null> {
    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];

    const prompt = `You are an expert curriculum designer and capacity building educator.
Analyze the following course text and generate exactly ${count} multiple-choice questions for ${difficulty} level trainees.

Each question must strictly have:
1. "text": The question prompt.
2. "options": Exactly 4 options array with "id" ("opt_1", "opt_2", "opt_3", "opt_4") and "text".
3. "correctOptionId": The id of the single correct option (e.g. "opt_1").
4. "explanation": A concise 1-2 sentence explanation.
5. "suggestedDifficulty": "${difficulty}"

Source Content:
"""
${content.slice(0, 5000)}
"""

Output JSON array format:
[
  {
    "text": "Question prompt here?",
    "options": [
      { "id": "opt_1", "text": "Option A" },
      { "id": "opt_2", "text": "Option B" },
      { "id": "opt_3", "text": "Option C" },
      { "id": "opt_4", "text": "Option D" }
    ],
    "correctOptionId": "opt_1",
    "explanation": "Explanation text here",
    "suggestedDifficulty": "${difficulty}"
  }
]`;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              response_mime_type: 'application/json',
            },
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          continue;
        }

        const data: any = await response.json();
        const rawText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!rawText) continue;

        // Clean any code block fencing or extra markdown
        const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : rawText.trim();
        const parsed = JSON.parse(jsonString);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            tempId: `gemini-cand-${Date.now()}-${idx + 1}`,
            text: item.text || `Question ${idx + 1}`,
            options: Array.isArray(item.options) && item.options.length === 4
              ? item.options
              : [
                  { id: 'opt_1', text: item.options?.[0]?.text || 'Option A' },
                  { id: 'opt_2', text: item.options?.[1]?.text || 'Option B' },
                  { id: 'opt_3', text: item.options?.[2]?.text || 'Option C' },
                  { id: 'opt_4', text: item.options?.[3]?.text || 'Option D' },
                ],
            correctOptionId: item.correctOptionId || 'opt_1',
            explanation:
              item.explanation || 'Verified based on course lecture material.',
            suggestedDifficulty: difficulty,
          }));
        }
      } catch (err: any) {
        this.logger.debug(`Model ${model} attempt error: ${err?.message}`);
      }
    }

    return null;
  }

  /**
   * Local heuristic fallback generator.
   */
  private generateLocally(
    content: string,
    count: number,
    difficulty: string,
  ): {
    sourceLength: number;
    generatedCount: number;
    candidateQuestions: CandidateQuestion[];
  } {
    this.logger.log(
      `Generating ${count} AI candidate questions via local NLP from content length ${content.length}`,
    );

    const sentences = content
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    const questions: CandidateQuestion[] = [];

    for (let i = 0; i < Math.min(count, Math.max(1, sentences.length)); i++) {
      const sentence = sentences[i % sentences.length];
      const qNum = i + 1;

      let qText = `Based on the course material: What is the primary characteristic or function discussed in "${sentence.slice(0, 60)}..."?`;
      let correctAns = sentence;
      let distractor1 = `It operates contrary to standard atmospheric thermodynamics under non-hydrostatic conditions.`;
      let distractor2 = `It strictly requires manual observational calibration without computational assimilation.`;
      let distractor3 = `It applies exclusively to equatorial maritime boundaries below 500 hPa altitude.`;
      let explanation = `According to the training material, '${sentence}' represents the verified scientific standard.`;

      const numMatch = sentence.match(
        /(\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(?:GHz|hPa|km|m\/s|%|°C|K|hours|days|MW))/i,
      );
      if (numMatch) {
        qText = `According to the module text, what is the specified value or operational parameter regarding "${sentence.slice(0, 50)}..."?`;
        correctAns = numMatch[0];
        distractor1 = `10–20% higher than standard threshold`;
        distractor2 = `0.5x standard baseline specification`;
        distractor3 = `Variable parameter dependent on seasonal cycle`;
        explanation = `The correct measurement specified in the documentation is ${numMatch[0]}.`;
      } else if (
        sentence.toLowerCase().includes('is defined as') ||
        sentence.toLowerCase().includes('refers to') ||
        sentence.toLowerCase().includes('uses')
      ) {
        qText = `Which of the following statements accurately summarizes the principle: "${sentence.slice(0, 50)}..."?`;
        correctAns = sentence;
        distractor1 = `An alternative formulation where kinetic dissipation exceeds radiative flux balance.`;
        distractor2 = `A historical hypothesis superseded by satellite scatterometer telemetry.`;
        distractor3 = `A secondary perturbation ignored in numerical grid approximations.`;
        explanation = `The verified definition stated in the course text is: "${sentence}".`;
      }

      questions.push({
        tempId: `ai-cand-${Date.now()}-${qNum}`,
        text: qText,
        options: [
          { id: 'opt_1', text: correctAns },
          { id: 'opt_2', text: distractor1 },
          { id: 'opt_3', text: distractor2 },
          { id: 'opt_4', text: distractor3 },
        ],
        correctOptionId: 'opt_1',
        explanation,
        suggestedDifficulty: difficulty,
      });
    }

    return {
      sourceLength: content.length,
      generatedCount: questions.length,
      candidateQuestions: questions,
    };
  }
}
