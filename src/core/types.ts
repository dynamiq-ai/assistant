export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
  files?: File[];
  intermediateSteps?: string[];
}

export interface ApiConfig {
  url: string;
  headers?: Record<string, string>;
  streaming?: boolean;
}

export interface CustomParams {
  userId: string;
  sessionId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ChatWidgetOptions {
  title?: string | React.ReactNode;
  placeholder?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  footerText?: string; // text or html
  poweredBy?: string; // text or html
  humanSupport?: string; // text or html
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  allowFileUpload?: boolean;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string; // MIME types or extensions
  toggleButton?: string; // id of the button to toggle the chat widget
  allowFullScreen?: boolean;
  api?: ApiConfig;
  params?: {
    userId?: string;
    sessionId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  prompts?: {
    icon: string | React.ReactNode;
    text: string;
  }[];
  intermediateStreaming?: boolean;
  onFeedback?: (
    event: Event,
    feedback: 'positive' | 'negative',
    messages: ChatMessage[],
    params: CustomParams
  ) => void;
  onImageBlock?: (imageInfo: string[]) => Promise<string[]>;
  onLink?: (linkInfo: Record<string, string>) => string;
}

export interface HistoryChat {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  title: string;
  updatedAt: number;
}

export interface ContentTypes {
  analysis?: string;
  thought?: string;
  tool?: {
    id: string;
    name: string;
  };
  name?: string;
  [key: string]: unknown;
}
