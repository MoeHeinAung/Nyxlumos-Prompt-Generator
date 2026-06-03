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
    request<{ session_id: string; current_state: string; next_action: string; data?: any }>(
      "/sessions",
      { method: "POST", body: JSON.stringify({ original_input, language }) }
    ),

  getSession: (sessionId: string) =>
    request<any>(`/sessions/${sessionId}`),

  advanceSession: (sessionId: string, userInput?: any) =>
    request<any>(`/sessions/${sessionId}/advance`, {
      method: "POST",
      body: JSON.stringify({ user_input: userInput }),
    }),

  // Intent
  extractIntent: (sessionId: string, translatedText: string) =>
    request<{ intent: any; classification: any }>("/intent/extract", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, translated_text: translatedText }),
    }),

  // Clarify
  generateQuestions: (sessionId: string, missingInfo: string[]) =>
    request<{ questions: any[] }>("/clarify/generate-questions", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, missing_info: missingInfo }),
    }),

  // Generate
  generatePrompt: (sessionId: string, targetModel: string, enabledHarnesses: string[]) =>
    request<{ final_prompt: string; reasoning_trace: string; validation_result: any }>(
      "/generate",
      { method: "POST", body: JSON.stringify({ session_id: sessionId, target_model: targetModel, enabled_harnesses: enabledHarnesses }) }
    ),

  // Models
  getModels: () =>
    request<any[]>("/models"),

  // History
  getHistory: (limit: number = 20, offset: number = 0) =>
    request<{ items: any[]; total: number }>(`/history?limit=${limit}&offset=${offset}`),

  deleteHistory: (id: string) =>
    request<{ deleted: boolean }>(`/history/${id}/delete`, { method: "POST" }),

  // Analytics
  getSessionAnalytics: (days: number = 30) =>
    request<{ daily_counts: any[] }>(`/analytics/sessions?days=${days}`),
  getModelAnalytics: () =>
    request<{ model_usage: any[] }>("/analytics/models"),
  getHarnessAnalytics: () =>
    request<{ harness_stats: any[] }>("/analytics/harnesses"),
  getComplexityAnalytics: () =>
    request<{ distribution: any[] }>("/analytics/complexity"),
};
