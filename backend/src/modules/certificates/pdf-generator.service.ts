import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

export interface CertificateData {
  traineeName: string;
  courseName: string;
  trainerName: string;
  issueDate: Date;
  certificateCode: string;
  score: number;
  issuingBody?: string;
}

@Injectable()
export class CertificatePdfGeneratorService {
  /**
   * Generate a professional certificate PDF and return as buffer
   */
  generateCertificatePdf(data: CertificateData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => {
          chunks.push(chunk);
        });

        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        doc.on('error', (err) => {
          reject(err);
        });

        // Draw certificate background
        this.drawCertificateTemplate(doc, data);

        // Finalize document
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Draw the certificate template on the PDF document
   */
  private drawCertificateTemplate(doc: PDFKit.PDFDocument, data: CertificateData): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Draw decorative border
    doc.lineWidth(3)
      .strokeColor('#1e40af')
      .moveTo(40, 40)
      .lineTo(pageWidth - 40, 40)
      .lineTo(pageWidth - 40, pageHeight - 40)
      .lineTo(40, pageHeight - 40)
      .lineTo(40, 40)
      .stroke();

    // Draw inner decorative border
    doc.lineWidth(1)
      .strokeColor('#3b82f6')
      .moveTo(50, 50)
      .lineTo(pageWidth - 50, 50)
      .lineTo(pageWidth - 50, pageHeight - 50)
      .lineTo(50, pageHeight - 50)
      .lineTo(50, 50)
      .stroke();

    // Add header logo/text
    doc.fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text('SyllabIQ', { align: 'center' })
      .moveDown(0.3);

    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Digital Capacity Building & Learning Management Portal', { align: 'center' })
      .moveDown(1);

    // Certificate title
    doc.fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text('Certificate of Achievement', { align: 'center' })
      .moveDown(1);

    // Achievement message
    doc.fontSize(12)
      .font('Helvetica')
      .fillColor('#333333')
      .text('This is to certify that', { align: 'center' })
      .moveDown(0.5);

    // Trainee name
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text(data.traineeName, { align: 'center' })
      .moveDown(0.5);

    // Course completion message
    doc.fontSize(12)
      .font('Helvetica')
      .fillColor('#333333')
      .text('has successfully completed the course', { align: 'center' })
      .moveDown(0.3);

    // Course name
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text(data.courseName, { align: 'center' })
      .moveDown(1);

    // Score information
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Score: ${data.score}%`, { align: 'center' })
      .moveDown(1);

    // Trainer name
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#333333');

    doc.text('Instructor: ', { continued: true })
      .font('Helvetica-Bold')
      .text(data.trainerName, { align: 'left' });

    doc.moveDown(1.5);

    // Date and certificate code section
    const leftMargin = 80;
    const rightMargin = pageWidth - 80;
    const currentY = doc.y;

    // Issue date
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Date Issued:', leftMargin, currentY);

    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text(this.formatDate(data.issueDate), leftMargin, currentY + 20);

    // Certificate code (verification ID)
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Certificate ID:', rightMargin - 120, currentY);

    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text(data.certificateCode, rightMargin - 120, currentY + 20);

    doc.moveDown(3);

    // Signature placeholder
    const signatureY = doc.y;
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text('___________________', leftMargin, signatureY)
      .text('Authorized Signature', leftMargin, signatureY + 20);

    // Seal/Badge placeholder
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Official Seal', rightMargin - 80, signatureY + 10, { align: 'center' });

    // Footer
    doc.moveTo(50, pageHeight - 70)
      .lineTo(pageWidth - 50, pageHeight - 70)
      .strokeColor('#3b82f6')
      .stroke();

    doc.fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text(`Issued by: ${data.issuingBody || 'Ministry of Earth Sciences (MoES)'}`, 50, pageHeight - 60, {
        align: 'center',
      });

    doc.fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Verify this certificate at: https://syllabiq.gov.in/verify/' + data.certificateCode, 50, pageHeight - 45, {
        align: 'center',
      });
  }

  /**
   * Format date as readable string
   */
  private formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(date).toLocaleDateString('en-US', options);
  }
}
