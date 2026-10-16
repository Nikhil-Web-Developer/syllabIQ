import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedMulterFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storedPath: string;
}

@Injectable()
export class StorageService {
  private readonly uploadDir: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.resolve(
      process.cwd(),
      this.configService.get<string>('UPLOAD_DIR', 'uploads'),
    );
    this.secretKey = this.configService.get<string>(
      'STORAGE_SIGNING_KEY',
      this.configService.get<string>('JWT_SECRET', 'syllabiq-secret-key-2026'),
    );
    this.baseUrl = this.configService.get<string>('API_BASE_URL', '/api');

    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Validates file size (max 25MB for resources, 5MB for certs) and mime type
   */
  validateFile(
    file: UploadedMulterFile,
    maxSizeBytes = 25 * 1024 * 1024,
  ): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${maxSizeBytes / (1024 * 1024)}MB`,
      );
    }

    const allowedMimeTypes = [
      // Documents & PDF
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Presentations
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Images
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      // Videos
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/ogg',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file format (${file.mimetype}). Supported formats: PDF, Images, Videos (MP4, WEBM), Presentations (PPT, PPTX), Documents (DOC, DOCX).`,
      );
    }
  }

  /**
   * Persists a file and returns its storage metadata
   */
  async saveFile(
    file: UploadedMulterFile,
    subFolder = 'certificates',
    maxSizeBytes = 25 * 1024 * 1024,
  ): Promise<FileMetadata> {
    this.validateFile(file, maxSizeBytes);

    const folderPath = path.join(this.uploadDir, subFolder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fileExt = path.extname(file.originalname) || '.bin';
    const uniqueId = crypto.randomUUID();
    const storedFilename = `${uniqueId}${fileExt}`;
    const targetFilePath = path.join(folderPath, storedFilename);

    // Write file to disk
    await fs.promises.writeFile(targetFilePath, file.buffer);

    return {
      filename: `${subFolder}/${storedFilename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storedPath: targetFilePath,
    };
  }

  /**
   * Persists a generated buffer under a storage key and returns that key.
   */
  async uploadBuffer(buffer: Buffer, fileKey: string): Promise<string> {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BadRequestException('A non-empty file buffer is required');
    }

    const targetPath = this.resolveStoragePath(fileKey);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, buffer);
    return path.relative(this.uploadDir, targetPath).split(path.sep).join('/');
  }

  /**
   * Reads a stored file by its storage key.
   */
  async download(fileKey: string): Promise<Buffer> {
    const filePath = this.resolveStoragePath(fileKey);
    try {
      return await fs.promises.readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Requested file does not exist on storage');
      }
      throw error;
    }
  }

  private resolveStoragePath(fileKey: string): string {
    if (!fileKey || fileKey.includes('\0') || path.isAbsolute(fileKey)) {
      throw new BadRequestException('Invalid storage file key');
    }

    const targetPath = path.resolve(this.uploadDir, fileKey);
    if (!targetPath.startsWith(`${this.uploadDir}${path.sep}`)) {
      throw new BadRequestException('Invalid storage file key');
    }

    return targetPath;
  }

  /**
   * Generates a tamper-proof time-limited signed URL for secure object access
   * (Compliant with Section 4.5 Security - No public buckets)
   */
  generateSignedUrl(fileKey: string, expiresInSeconds = 86400): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const dataToSign = `${fileKey}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(dataToSign)
      .digest('hex');

    return `${this.baseUrl}/storage/files/${encodeURIComponent(
      fileKey,
    )}?expires=${expiresAt}&sig=${signature}`;
  }

  /**
   * Verifies the HMAC signature and expiration timestamp for a requested file
   */
  verifySignature(fileKey: string, expiresStr: string, signature: string): boolean {
    if (!signature || typeof signature !== 'string' || !expiresStr) {
      return false;
    }
    const expiresAt = parseInt(expiresStr, 10);
    if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      return false;
    }

    const dataToSign = `${fileKey}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(dataToSign)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');

    if (sigBuf.length !== expBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  /**
   * Resolves absolute file path on disk after verifying signature
   */
  getFilePathIfValid(
    fileKey: string,
    expiresStr?: string,
    signature?: string,
  ): { filePath: string; mimeType: string } {
    if (!expiresStr || !signature) {
      throw new ForbiddenException('Missing signed access token or expiry timestamp');
    }

    const isValid = this.verifySignature(fileKey, expiresStr, signature);
    if (!isValid) {
      throw new ForbiddenException('Invalid or expired signed URL');
    }

    const fullPath = path.join(this.uploadDir, fileKey);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Requested file does not exist on storage');
    }

    // Infer content type
    const ext = path.extname(fullPath).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.mp4') mimeType = 'video/mp4';
    else if (ext === '.webm') mimeType = 'video/webm';
    else if (ext === '.ppt' || ext === '.pptx')
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    else if (ext === '.doc' || ext === '.docx')
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return { filePath: fullPath, mimeType };
  }
}
