// Editor specific types
export interface EditorConfig {
  geminiApiKey: string;
  proxyConfig?: ProxyConfig;
  dataPath: string;
  autoSave: boolean;
}

export interface ProxyConfig {
  enabled: boolean;
  url?: string;
  auth?: {
    username: string;
    password: string;
  };
  timeout?: number;
}

export interface ValidationReport {
  characters: Array<{
    id: string;
    name: string;
    isValid: boolean;
    issues: Array<{ field: string; message: string }>;
  }>;
  events: Array<{
    id: string;
    characterId: string;
    title: string;
    isValid: boolean;
    issues: Array<{ field: string; message: string }>;
  }>;
  isValid: boolean;
}

export interface GameDataContext {
  characters: Array<{ name: string; id: string }>;
  eventCount: number;
  factions: string[];
}

export interface ConnectionTestResult {
  proxy: boolean;
  geminiApi: boolean;
  details: {
    proxyUrl?: string;
    proxyError?: string;
    geminiError?: string;
  };
}

export interface BalanceAnalysis {
  averageGameLength: number;
  survivalRate: number;
  attributeDistribution: {
    health: number;
    authority: number;
    treasury: number;
    military: number;
    popularity: number;
  };
  recommendations: string[];
}

export interface EventFlowAnalysis {
  totalEvents: number;
  activatableEvents: number;
  weightDistribution: Record<number, number>;
  potentialDeadlocks: string[];
  recommendations: string[];
}
