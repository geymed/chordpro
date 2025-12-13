import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import { ChordSheet } from '../types';
import { ChordSheetFile } from './chord-sheet-format';

interface UploadResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface BulkUploadResult {
  success: boolean;
  uploaded: number;
  failed: number;
  results: string[];
  errors: Array<{ file: string; error: string }>;
}

class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 300000, // 5 minutes timeout for bulk uploads
    });
  }

  /**
   * Uploads a single chord sheet file
   */
  async uploadSheet(sheet: ChordSheet): Promise<UploadResult> {
    try {
      const response = await this.client.post('/api/sheets', sheet);
      return {
        success: true,
        id: response.data.id,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Uploads a chord sheet file from disk
   */
  async uploadSheetFile(filePath: string): Promise<UploadResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const file: ChordSheetFile = JSON.parse(content);

      if (file.version !== '1.0') {
        return {
          success: false,
          error: `Unsupported file version: ${file.version}`,
        };
      }

      return await this.uploadSheet(file.sheet);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Uploads multiple chord sheet files as a ZIP archive
   */
  async uploadBulk(zipPath: string): Promise<BulkUploadResult> {
    try {
      const formData = new FormData();
      formData.append('zip', fs.createReadStream(zipPath));

      const response = await this.client.post('/api/sheets/upload/bulk', formData, {
        headers: formData.getHeaders(),
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          uploaded: 0,
          failed: 0,
          results: [],
          errors: [{ file: zipPath, error: error.response?.data?.error || error.message }],
        };
      }
      return {
        success: false,
        uploaded: 0,
        failed: 0,
        results: [],
        errors: [{ file: zipPath, error: error instanceof Error ? error.message : String(error) }],
      };
    }
  }

  /**
   * Checks if the API is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/sheets');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export default ApiClient;


