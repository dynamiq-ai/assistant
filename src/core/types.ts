export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  files?: File[];
}

export interface ApiConfig {
  url: string;
  headers?: Record<string, string>;
  streaming?: boolean;
  userId?: string;
  sessionId?: string;
}

export interface ChatWidgetOptions {
  title?: string;
  placeholder?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  api?: ApiConfig;
  allowFileUpload?: boolean;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string; // MIME types or extensions
} 