export interface TranslationCommandOptions {
  secretKey: string;
  apiUrl: string;
  directory: string;
}

export interface MasterJsonResponse {
  data: Record<string, unknown>;
  locale: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  imported: number;
  errors?: string[];
}

export interface TranslationFile {
  locale: string;
  filePath: string;
  content: Record<string, unknown>;
}
