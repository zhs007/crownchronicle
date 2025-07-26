import { SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';

// Gemini API related types
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiResponse {
  type: 'text' | 'function_calls' | 'error';
  content?: string;
  results?: GeminiFunctionResult[];
  error?: string;
}

export interface GeminiFunctionResult {
  type: 'success' | 'error';
  action?: string;
  data?: unknown;
  function?: string;
  message?: string;
  error?: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  generationConfig: {
    temperature: number;
    topK: number;
    topP: number;
    maxOutputTokens: number;
  };
}

export interface FunctionCallSchema {
  name: string;
  description: string;
  parameters: {
    type: SchemaType;
    properties: { [k: string]: Schema };
    required: string[];
  };
}
