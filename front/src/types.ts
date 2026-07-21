export type UserRole = 'admin' | 'user';

export type Department =
  | 'RH'
  | 'Marketing'
  | 'Comercial'
  | 'Financeiro'
  | 'Jurídico'
  | 'Planejamento'
  | 'Gestão'
  | 'Backoffice';

export type AIModel = 'OpenAI' | 'Gemini' | 'Claude' | 'ChatGPT' | 'Gemma 4 31B' | 'Copilot' | 'Manus';
export type Tone = 'Profissional' | 'Criativo' | 'Técnico' | 'Amigável';
export type Depth = 'Curto' | 'Normal' | 'Longo' | 'Muito Longo';

export interface Template {
  id: string;
  name: string;
  description: string;
  department: Department;
  objective: string;
  complexity: 'Básico' | 'Intermediário' | 'Avançado';
  tags: string[];
  basePrompt: string;
  variables: string[];
  popular: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sector: string;
}

export interface AIInteraction {
  id: string;
  userId: string;
  userName: string;
  userSector: string;
  prompt: string;
  response: string;
  model: string;
  timestamp: string;
  type: 'text' | 'analysis' | 'support' | 'case';
}

export interface AICase {
  id: string;
  sector: string;
  title: string;
  situation: string;
  example: string;
  prompt: string;
}

export interface UsageInsight {
  sector: string;
  usageCount: number;
  avgLevel: 'Básico' | 'Intermediário' | 'Avançado';
  topPadrão: string;
}
