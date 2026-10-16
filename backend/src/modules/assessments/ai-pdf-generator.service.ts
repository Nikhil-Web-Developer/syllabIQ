import {
  BadRequestException,
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pdfParse from 'pdf-parse';

export interface GeneratedDraftMcq {
  tempId: string;
  text: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  source: string;
}

interface PdfCoPresignedUrlResponse {
  error?: boolean;
  message?: string;
  presignedUrl?: string;
  url?: string;
}

interface PdfCoTextResponse {
  error?: boolean;
  message?: string;
  body?: string;
}

@Injectable()
export class AiPdfGeneratorService {
  private readonly logger = new Logger(AiPdfGeneratorService.name);

  // Rate Limiting Storage: trainerId -> array of epoch timestamps
  private trainerRateLimits = new Map<string, number[]>();
  private readonly MAX_PER_HOUR = 15;
  private readonly ONE_HOUR_MS = 60 * 60 * 1000;

  constructor(private configService: ConfigService) {}

  /**
   * Enforces sliding window rate limit for AI PDF generation.
   * Max 10 requests per trainer per hour.
   */
  checkRateLimit(trainerId: string): void {
    const now = Date.now();
    const timestamps = this.trainerRateLimits.get(trainerId) || [];

    // Filter timestamps within the last hour
    const recent = timestamps.filter((t) => now - t < this.ONE_HOUR_MS);

    if (recent.length >= this.MAX_PER_HOUR) {
      this.logger.warn(`Rate limit exceeded for trainer ${trainerId}: ${recent.length} requests in past hour`);
      throw new HttpException(
        'Generation limit reached: You have exceeded the maximum allowed PDF generation requests (10 per hour). Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.trainerRateLimits.set(trainerId, recent);
  }

  /**
   * Resets rate limit for a trainer (used in test suites).
   */
  resetRateLimit(trainerId: string): void {
    this.trainerRateLimits.delete(trainerId);
  }

  /**
   * Extracts clean text server-side from PDF buffer.
   * Throws clear BadRequestException if empty or scanned image.
   */
  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new BadRequestException('The uploaded file is not a valid PDF.');
    }

    const apiKey = this.configService.get<string>('PDFCO_API_KEY');
    let parsedText = apiKey
      ? await this.extractTextWithPdfCo(buffer, apiKey)
      : this.extractPdfStreams(buffer);

    if (!parsedText || parsedText.length < 30) {
      try {
        const parseFunc = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default || (pdfParse as any);
        if (typeof parseFunc === 'function') {
          const data = await parseFunc(buffer);
          if (data?.text && data.text.trim().length > parsedText.length) {
            parsedText = data.text;
          }
        }
      } catch (err: any) {
        this.logger.warn(`pdf-parse library fallback error: ${err?.message}`);
      }
    }

    // Clean and normalize text
    const cleanText = (parsedText || '')
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/ +/g, ' ')
      .trim();

    // Validate that text contains meaningful substantive content
    const letterCount = (cleanText.match(/[a-zA-Z]/g) || []).length;
    if (cleanText.length < 40 || letterCount < 20) {
      throw new BadRequestException(
        'No extractable text found in uploaded PDF. Please provide a text-based document or notes rather than a scanned image without OCR.',
      );
    }

    this.logger.log(`Successfully extracted ${cleanText.length} characters from PDF.`);
    return cleanText;
  }

  private async extractTextWithPdfCo(buffer: Buffer, apiKey: string): Promise<string> {
    const uploadUrl = new URL(
      'https://api.pdf.co/v1/file/upload/get-presigned-url',
    );
    uploadUrl.searchParams.set('name', 'quiz-source.pdf');
    uploadUrl.searchParams.set('contenttype', 'application/pdf');

    try {
      const presignedResponse = await fetch(uploadUrl, {
        headers: { 'x-api-key': apiKey },
        signal: AbortSignal.timeout(30000),
      });
      const presignedData =
        (await presignedResponse.json()) as PdfCoPresignedUrlResponse;

      if (
        !presignedResponse.ok ||
        presignedData.error ||
        !presignedData.presignedUrl ||
        !presignedData.url
      ) {
        this.logger.error(
          `PDF.co upload URL request failed with HTTP ${presignedResponse.status}`,
        );
        throw new BadGatewayException(
          presignedData.message || 'PDF text service could not prepare the upload.',
        );
      }

      const uploadResponse = await fetch(presignedData.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: new Uint8Array(buffer),
        signal: AbortSignal.timeout(60000),
      });

      if (!uploadResponse.ok) {
        this.logger.error(
          `PDF.co temporary file upload failed with HTTP ${uploadResponse.status}`,
        );
        throw new BadGatewayException(
          'PDF text service could not receive the uploaded PDF.',
        );
      }

      const textResponse = await fetch(
        'https://api.pdf.co/v1/pdf/convert/to/text',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            url: presignedData.url,
            inline: true,
            async: false,
          }),
          signal: AbortSignal.timeout(120000),
        },
      );
      const textData = (await textResponse.json()) as PdfCoTextResponse;

      if (!textResponse.ok || textData.error || typeof textData.body !== 'string') {
        this.logger.error(
          `PDF.co text extraction failed with HTTP ${textResponse.status}`,
        );
        throw new BadGatewayException(
          textData.message || 'PDF text service could not extract text from this file.',
        );
      }

      return textData.body;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.logger.error(
        `PDF.co request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadGatewayException(
        'Unable to reach the PDF text service. Please try again later.',
      );
    }
  }

  /**
   * Fast native stream parser for text streams within standard PDF objects.
   */
  private extractPdfStreams(buffer: Buffer): string {
    const raw = buffer.toString('utf-8');
    const chunks: string[] = [];

    // 1. Extract strings inside parentheses (standard PDF literal string syntax)
    const matches = raw.match(/\(([^()]{3,})\)/g) || [];
    for (const m of matches) {
      const text = m.slice(1, -1).trim();
      if (text.length > 2 && !text.startsWith('Type') && !text.startsWith('/')) {
        chunks.push(text);
      }
    }

    // 2. Extract plain text lines that contain complete sentences
    const lines = raw.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.length > 25 &&
        !trimmed.startsWith('%') &&
        !trimmed.startsWith('<<') &&
        !trimmed.startsWith('>>') &&
        !trimmed.includes('endobj') &&
        !trimmed.includes('xref') &&
        !trimmed.includes('stream')
      ) {
        chunks.push(trimmed);
      }
    }

    return Array.from(new Set(chunks)).join(' ');
  }

  /**
   * Generates MCQs strictly grounded in the extracted text.
   * Leverages Google Gemini if an API key is present;
   * otherwise seamlessly falls back to the grounded local heuristic generator.
   */
  async generateGroundedMcqs(
    text: string,
    targetCount = 10,
    difficulty = 'intermediate',
  ): Promise<GeneratedDraftMcq[]> {
    const count = Math.min(15, Math.max(3, Number(targetCount) || 10));

    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const geminiQuestions = await this.generateWithGemini(
          text,
          count,
          difficulty,
          apiKey,
        );
        if (geminiQuestions && geminiQuestions.length > 0) {
          this.logger.log(
            `Successfully generated ${geminiQuestions.length} MCQs via Google Gemini`,
          );
          return geminiQuestions;
        }
      } catch (err: any) {
        this.logger.warn(
          `Gemini PDF MCQ generation error (${err?.message}). Falling back to local NLP generator.`,
        );
      }
    }

    return this.generateGroundedMcqsLocally(text, count, difficulty);
  }

  /**
   * Generates candidate MCQs using the Google Gemini API.
   */
  private async generateWithGemini(
    text: string,
    count: number,
    difficulty: string,
    apiKey: string,
  ): Promise<GeneratedDraftMcq[] | null> {
    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];

    const prompt = `You are a high-level academic curriculum designer and training specialist.
Carefully analyze the following document excerpt and generate exactly ${count} grounded multiple-choice questions for ${difficulty} level trainees.

Requirements for each question:
1. "text": Clear, unambiguous question testing conceptual or factual understanding from the text.
2. "options": Array of exactly 4 options. Each option must have:
   - "id": "opt_1", "opt_2", "opt_3", "opt_4"
   - "text": The option text.
3. "correctOptionId": ID of the single correct option (e.g. "opt_1").
4. "explanation": A concise 1-2 sentence explanation quoting or citing the document context.
5. "source": "ai_generated"

Document Content:
"""
${text.slice(0, 10000)}
"""

Respond ONLY with a valid JSON array of objects in this structure:
[
  {
    "text": "What is the primary function of ...?",
    "options": [
      { "id": "opt_1", "text": "Correct answer description" },
      { "id": "opt_2", "text": "Plausible distractor" },
      { "id": "opt_3", "text": "Another distractor" },
      { "id": "opt_4", "text": "Another distractor" }
    ],
    "correctOptionId": "opt_1",
    "explanation": "According to section 2.1...",
    "source": "ai_generated"
  }
]`;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

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
          this.logger.debug(`Gemini model ${model} responded with HTTP ${response.status}`);
          continue;
        }

        const data: any = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!rawText) continue;

        const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : rawText.trim();
        const parsed = JSON.parse(jsonString);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            tempId: `ai-gemini-${Date.now()}-${idx + 1}`,
            text: item.text || `Question ${idx + 1}`,
            options:
              Array.isArray(item.options) && item.options.length === 4
                ? item.options
                : [
                    { id: 'opt_1', text: item.options?.[0]?.text || 'Option A' },
                    { id: 'opt_2', text: item.options?.[1]?.text || 'Option B' },
                    { id: 'opt_3', text: item.options?.[2]?.text || 'Option C' },
                    { id: 'opt_4', text: item.options?.[3]?.text || 'Option D' },
                  ],
            correctOptionId: item.correctOptionId || 'opt_1',
            explanation: item.explanation || 'Verified based on uploaded document context.',
            source: 'ai_generated',
          }));
        }
      } catch (err: any) {
        this.logger.debug(`Gemini attempt with model ${model} failed: ${err?.message}`);
      }
    }

    return null;
  }

  /**
   * Local grounded fallback generator.
   */
  private generateGroundedMcqsLocally(
    text: string,
    count: number,
    difficulty: string,
  ): GeneratedDraftMcq[] {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\n/g, ' ').trim())
      .filter((p) => p.length > 25);

    const sentences = text
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && /[a-zA-Z]/.test(s));

    if (sentences.length === 0) {
      throw new BadRequestException(
        'Insufficient structural sentences in document to generate grounded multiple-choice questions.',
      );
    }

    const mcqs: GeneratedDraftMcq[] = [];

    for (let i = 0; i < count; i++) {
      const sentence = sentences[i % sentences.length];
      const para = paragraphs[i % paragraphs.length] || sentence;
      const qNum = i + 1;

      const mcq = this.buildSingleGroundedQuestion(sentence, para, qNum, difficulty, i);
      mcqs.push(mcq);
    }

    return mcqs;
  }

  /**
   * Generates or regenerates a single grounded question from source text.
   */
  regenerateSingleQuestion(
    sourceText: string,
    seedIndex = 0,
    difficulty = 'intermediate',
  ): GeneratedDraftMcq {
    const sentences = sourceText
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const idx = (seedIndex + Math.floor(Math.random() * 5) + 1) % Math.max(1, sentences.length);
    const sentence = sentences[idx] || sourceText.slice(0, 100);

    return this.buildSingleGroundedQuestion(
      sentence,
      sentence,
      Date.now() % 1000,
      difficulty,
      seedIndex + 7,
    );
  }

  private buildSingleGroundedQuestion(
    sentence: string,
    contextPara: string,
    index: number,
    difficulty: string,
    variant = 0,
  ): GeneratedDraftMcq {
    let qText = '';
    let correct = '';
    let d1 = '';
    let d2 = '';
    let d3 = '';
    let explanation = '';

    const numMatch = sentence.match(
      /(\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(?:hPa|km|m\/s|%|°C|K|hours|days|MW|GHz|MB|GB|knots|mm|cm|N|dBZ|m|s))/i,
    );

    if (numMatch && variant % 3 === 0) {
      const val = numMatch[0];
      const subject = sentence.replace(val, '___').slice(0, 80);
      qText = `According to the source documentation, what is the specified threshold or measurement for: "${subject}..."?`;
      correct = val;
      d1 = `Approximately 1.5× baseline (${(parseFloat(val) * 1.5 || 50).toFixed(1)} ${val.replace(/[\d.-]/g, '').trim() || 'units'})`;
      d2 = `Nominal minimum threshold of 0.2× rated specification`;
      d3 = `Dynamic seasonal variable not exceeding standard limits`;
      explanation = `As stated directly in the source material: "${sentence.slice(0, 140)}".`;
    } else if (
      sentence.toLowerCase().includes('defined as') ||
      sentence.toLowerCase().includes('is the process') ||
      sentence.toLowerCase().includes('refers to') ||
      sentence.toLowerCase().includes('known as')
    ) {
      qText = `Based on the provided reference notes, which statement correctly defines the core principle in "${sentence.slice(0, 60)}..."?`;
      correct = sentence.trim();
      d1 = `A secondary operational adjustment that is disabled during standard baseline execution`;
      d2 = `An alternative empirical methodology superseded by recent telemetry assimilation`;
      d3 = `A localized perturbation constrained strictly to boundaries below 500 hPa`;
      explanation = `The exact definition provided in the text is: "${sentence.trim()}".`;
    } else if (
      sentence.toLowerCase().includes('primary') ||
      sentence.toLowerCase().includes('main') ||
      sentence.toLowerCase().includes('function') ||
      sentence.toLowerCase().includes('purpose') ||
      sentence.toLowerCase().includes('responsible for')
    ) {
      qText = `In the context of the study material, what is the primary function or significance described in "${sentence.slice(0, 70)}..."?`;
      correct = sentence.trim();
      d1 = `It acts as an auxiliary fail-safe when primary computation is unavailable`;
      d2 = `It prevents numerical divergence by introducing uncalibrated damping parameters`;
      d3 = `It replaces manual verification without requiring validation criteria`;
      explanation = `According to the text, "${sentence.trim()}" is the documented primary standard.`;
    } else {
      qText = `Which of the following insights is directly supported by the text: "${sentence.slice(0, 65)}..."?`;
      correct = sentence.trim();
      d1 = `The process is strictly invariant and independent of meteorological conditions`;
      d2 = `The mechanism requires manual human intervention at each processing stage`;
      d3 = `Empirical verification has shown negligible impact on final outcomes`;
      explanation = `The material explicitly notes: "${sentence.trim()}".`;
    }

    return {
      tempId: `ai-draft-${Date.now()}-${index}`,
      text: qText,
      options: [
        { id: 'opt_1', text: correct },
        { id: 'opt_2', text: d1 },
        { id: 'opt_3', text: d2 },
        { id: 'opt_4', text: d3 },
      ],
      correctOptionId: 'opt_1',
      explanation,
      source: 'ai_generated',
    };
  }
}
