export interface Intent {
  primary_intent: string;
  domain: string;
  entities: { name: string; type: string }[];
  constraints: { field: string; severity: string; weight?: number }[];
  missing_info: string[];
  complexity_score: number;
  scope: string;
  output_type: string;
  recommended_harness?: string[];
}

export interface Classification {
  categories: string[];
  domain: string;
  complexity_score: number;
  scope: string;
}

export interface Question {
  id: string;
  field: string;
  question: string;
  options: string[];
  allows_custom: boolean;
  context: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  family: string;
  strengths: string;
  supports_harnesses: string[];
}

export interface ValidationResult {
  success: boolean;
  checks: { check: string; status: string; message: string }[];
  code_validation?: {
    success: boolean;
    output: string;
    errors: string;
  };
}

export interface SessionState {
  sessionId: string | null;
  currentState: string;
  originalInput: string;
  translatedInput: string;
  detectedLanguage: string;
  intent: Intent | null;
  classification: Classification | null;
  pendingQuestions: Question[];
  answers: Record<string, string>;
  selectedModel: string;
  enabledHarnesses: string[];
  generatedPrompt: string | null;
  reasoningTrace: string | null;
  validationResult: ValidationResult | null;
  isLoading: boolean;
  error: string | null;
  currentQuestionIndex: number;
}

export interface HistoryItem {
  id: string;
  session_id: string;
  title: string;
  original_request: string;
  final_prompt: string;
  target_model: string;
  harnesses_used: string[];
  complexity_score: number;
  scope: string;
  created_at: string;
}

export interface AnalyticsSessions {
  daily_counts: { date: string; count: number }[];
}

export interface AnalyticsModels {
  model_usage: { model: string; count: number }[];
}

export interface AnalyticsHarnesses {
  harness_stats: { harness: string; enabled_count: number; pass_rate: number }[];
}

export interface AnalyticsComplexity {
  distribution: { score: number; count: number }[];
}
