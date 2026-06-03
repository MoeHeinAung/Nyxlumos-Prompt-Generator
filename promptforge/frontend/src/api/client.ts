import type { SessionState, Intent, Classification, Question, ValidationResult, ModelInfo, HistoryItem } from "../types";

const API_BASE = "http://localhost:8000/api/v1";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

export const api = {
  // Translate
  translate: (text: string) =>
    request<{ translated_text: string; confidence: number; was_burmese: boolean; warnings: string[] }>(
      "/translate",
      { method: "POST", body: JSON.stringify({ text, source_lang: "auto", target_lang: "en" }) }
    ),

  // Sessions
  createSession: (original_input: string, language: string = "en") =>
    request<{ session_id: string; current_state: string; next_action: string; data?: Record<string, unknown> }>(
      "/sessions",
      { method: "POST", body: JSON.stringify({ original_input, language }) }
    ),

  getSession: (sessionId: string) =>
    request<SessionState>(`/sessions/${sessionId}`),

  advanceSession: (sessionId: string, userInput?: Record<string, unknown>) =>
    request<SessionState>(`/sessions/${sessionId}/advance`, {
      method: "POST",
      body: JSON.stringify({ user_input: userInput }),
    }),

  // Intent
  extractIntent: (sessionId: string, translatedText: string) =>
    request<{ intent: Intent; classification: Classification }>("/intent/extract", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, translated_text: translatedText }),
    }),

  // Clarify
  generateQuestions: (sessionId: string, missingInfo: string[]) =>
    request<{ questions: Question[] }>("/clarify/generate-questions", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, missing_info: missingInfo }),
    }),

  // Generate
  generatePrompt: (sessionId: string, targetModel: string, enabledHarnesses: string[]) =>
    request<{ final_prompt: string; reasoning_trace: string; validation_result: ValidationResult }>(
      "/generate",
      { method: "POST", body: JSON.stringify({ session_id: sessionId, target_model: targetModel, enabled_harnesses: enabledHarnesses }) }
    ),

  // Models
  getModels: () =>
    request<ModelInfo[]>("/models"),

  // History
  getHistory: (limit: number = 20, offset: number = 0) =>
    request<{ items: HistoryItem[]; total: number }>(`/history?limit=${limit}&offset=${offset}`),

  deleteHistory: (id: string) =>
    request<{ deleted: boolean }>(`/history/${id}`, { method: "DELETE" }),

  // Analytics
  getSessionAnalytics: (days: number = 30) =>
    request<{ daily_counts: { date: string; count: number }[] }>(`/analytics/sessions?days=${days}`),
  getModelAnalytics: () =>
    request<{ model_usage: { model: string; count: number }[] }>("/analytics/models"),
  getHarnessAnalytics: () =>
    request<{ harness_stats: { harness: string; enabled_count: number; pass_rate: number }[] }>("/analytics/harnesses"),
  getComplexityAnalytics: () =>
    request<{ distribution: { score: number; count: number }[] }>("/analytics/complexity"),
};
