import { Injectable, Logger } from '@nestjs/common';

export interface ParseResult {
  text: string;
  pageCount?: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  async parse(buffer: Buffer, fileType: string): Promise<ParseResult> {
    this.logger.log(`Parsing ${fileType} document...`);

    switch (fileType.toLowerCase()) {
      case 'pdf':
        return this.parsePdf(buffer);
      case 'docx':
        return this.parseDocx(buffer);
      case 'txt':
      case 'md':
        return this.parseText(buffer);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async parsePdf(buffer: Buffer): Promise<ParseResult> {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return { text: data.text, pageCount: data.numpages, metadata: data.metadata || {} };
    } catch (error) {
      this.logger.error(`PDF parsing failed: ${error}`);
      throw error;
    }
  }

  private async parseDocx(buffer: Buffer): Promise<ParseResult> {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value, metadata: { messages: result.messages } };
    } catch (error) {
      this.logger.error(`DOCX parsing failed: ${error}`);
      throw error;
    }
  }

  private parseText(buffer: Buffer): ParseResult {
    const text = buffer.toString('utf-8');
    return { text, metadata: {} };
  }
}
