import { create } from "zustand";
import type { SessionState } from "../types";
import { api } from "../api/client";

interface SessionActions {
  startSession: (input: string) => Promise<void>;
  submitAnswer: (questionId: string, answer: string) => Promise<void>;
  advanceToNextQuestion: () => void;
  selectModel: (model: string) => void;
  toggleHarness: (harness: string) => void;
  generatePrompt: () => Promise<void>;
  resetSession: () => void;
  setError: (err: string | null) => void;
}

const initialState: SessionState = {
  sessionId: null,
  currentState: "S1_INGEST",
  originalInput: "",
  translatedInput: "",
  detectedLanguage: "en",
  intent: null,
  classification: null,
  pendingQuestions: [],
  answers: {},
  selectedModel: "deepseek-chat",
  enabledHarnesses: ["reasoning_scaffold", "meta_cognitive"],
  generatedPrompt: null,
  reasoningTrace: null,
  validationResult: null,
  isLoading: false,
  error: null,
  currentQuestionIndex: 0,
};

export const useSessionStore = create<SessionState & SessionActions>((set, get) => ({
  ...initialState,

  startSession: async (input: string) => {
    set({ isLoading: true, error: null, originalInput: input });
    try {
      const session = await api.createSession(input);
      set({ sessionId: session.session_id, currentState: "S2_TRANSLATE", isLoading: false });

      const translateResult = await api.translate(input);
      set({ translatedInput: translateResult.translated_text, detectedLanguage: translateResult.was_burmese ? "my" : "en" });

      await api.advanceSession(session.session_id, { translated_text: translateResult.translated_text });
      set({ currentState: "S3_EXTRACT" });

      const intentResult = await api.extractIntent(session.session_id, translateResult.translated_text);
      set({
        intent: intentResult.intent,
        classification: intentResult.classification,
        currentState: "S4_GAP_ANALYSIS",
      });

      await api.advanceSession(session.session_id, { intent: intentResult.intent, classification: intentResult.classification });

      const missing = intentResult.intent?.missing_info || [];
      if (missing.length > 0) {
        const questionsResult = await api.generateQuestions(session.session_id, missing);
        set({
          pendingQuestions: questionsResult.questions,
          currentState: "S5_CLARIFY",
          currentQuestionIndex: 0,
        });
        await api.advanceSession(session.session_id);
      } else {
        set({ currentState: "S6_CLASSIFY" });
        await api.advanceSession(session.session_id);
      }

      set({ isLoading: false });
    } catch (e: unknown) {
      set({ isLoading: false, error: (e as Error).message || "Unknown error" });
    }
  },

  submitAnswer: async (questionId: string, answer: string) => {
    const { sessionId, answers } = get();
    if (!sessionId) return;
    const newAnswers = { ...answers, [questionId]: answer };
    set({ answers: newAnswers });
    try {
      await api.advanceSession(sessionId, newAnswers);
    } catch (e: unknown) {
      set({ error: (e as Error).message || "Unknown error" });
    }
  },

  advanceToNextQuestion: () => {
    const { currentQuestionIndex, pendingQuestions, sessionId } = get();
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= pendingQuestions.length) {
      set({ currentState: "S6_CLASSIFY", currentQuestionIndex: 0 });
      if (sessionId) {
        api.advanceSession(sessionId).catch(() => {});
      }
    } else {
      set({ currentQuestionIndex: nextIndex });
    }
  },

  selectModel: async (model: string) => {
    const { sessionId } = get();
    set({ selectedModel: model });
    if (sessionId) {
      try {
        await api.advanceSession(sessionId, { model });
        set({ currentState: "S8_HARNESS_SELECT" });
      } catch (e: unknown) {
        set({ error: (e as Error).message || "Unknown error" });
      }
    }
  },

  toggleHarness: (harness: string) => {
    const { enabledHarnesses } = get();
    if (enabledHarnesses.includes(harness)) {
      set({ enabledHarnesses: enabledHarnesses.filter((h) => h !== harness) });
    } else {
      set({ enabledHarnesses: [...enabledHarnesses, harness] });
    }
  },

  generatePrompt: async () => {
    const { sessionId, selectedModel, enabledHarnesses } = get();
    if (!sessionId) return;
    set({ isLoading: true, error: null });
    try {
      await api.advanceSession(sessionId, { model: selectedModel, harnesses: enabledHarnesses });
      const result = await api.generatePrompt(sessionId, selectedModel, enabledHarnesses);
      set({
        generatedPrompt: result.final_prompt,
        reasoningTrace: result.reasoning_trace,
        validationResult: result.validation_result,
        currentState: "S11_VALIDATE",
        isLoading: false,
      });
    } catch (e: unknown) {
      set({ isLoading: false, error: (e as Error).message || "Unknown error" });
    }
  },

  resetSession: () => set({ ...initialState }),

  setError: (err: string | null) => set({ error: err }),
}));
