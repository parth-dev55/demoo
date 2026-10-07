export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | number | Date;
  language?: 'en' | 'hi' | 'mr' | string;
  attachments?: Array<{ type: string; url: string }>;
  metadata?: Record<string, any>;
};

export type ChatSession = {
  id: string;
  userId: string;
  title: string;
  createdAt: string | number;
  updatedAt: string | number;
  language: 'en' | 'hi' | 'mr' | string;
  lastMessage: string;
  messageCount: number;
};

export type CropInsight = {
  name: string;
  health: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  healthScore: number;
  stage: string;
  expectedYield: string;
  nextAction: string;
};

export type WeatherData = {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
};
