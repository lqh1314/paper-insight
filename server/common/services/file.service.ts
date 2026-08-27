import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileService {
  private readonly uploadDir: string;
  private readonly fileBaseUrl: string;

  constructor(private config: ConfigService) {
    this.uploadDir = path.resolve(config.get<string>('UPLOAD_DIR', './uploads'));
    this.fileBaseUrl = config.get<string>('FILE_BASE_URL', 'http://localhost:3000');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 保存上传的文件到本地
   * @returns 本地路径和可访问URL
   */
  saveFile(file: Express.Multer.File): { filePath: string; fileUrl: string; fileName: string; fileSize: number } {
    const ext = path.extname(file.originalname);
    const id = uuidv4();
    const storedName = `${id}${ext}`;
    const filePath = path.join(this.uploadDir, storedName);
    fs.writeFileSync(filePath, file.buffer);
    const fileUrl = `/uploads/${storedName}`;
    return {
      filePath,
      fileUrl: fileUrl.startsWith('http') ? fileUrl : `${this.fileBaseUrl}${fileUrl}`,
      fileName: file.originalname,
      fileSize: file.size,
    };
  }

  getFilePath(storedName: string): string {
    return path.join(this.uploadDir, storedName);
  }
}
