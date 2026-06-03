import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import InputPanel from "./components/workflow/InputPanel";
import ClarificationWizard from "./components/workflow/ClarificationWizard";
import IntentCard from "./components/workflow/IntentCard";
import ModelSelector from "./components/workflow/ModelSelector";
import HarnessPanel from "./components/workflow/HarnessPanel";
import PromptOutput from "./components/workflow/PromptOutput";
import AnalyticsDashboard from "./components/dashboard/AnalyticsDashboard";
import SettingsModal from "./components/modals/SettingsModal";
import ExportModal from "./components/modals/ExportModal";
import type { HistoryItem, ModelInfo } from "./types";
import { useSessionStore } from "./stores/sessionStore";
import { api } from "./api/client";

const queryClient = new QueryClient();

function AppContent() {
  const [view, setView] = useState("workflow");
  const [showExport, setShowExport] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);

  const {
    sessionId, currentState, isLoading, error,
    generatedPrompt, pendingQuestions, intent, resetSession,
  } = useSessionStore();

  useEffect(() => {
    if (view === "history") {
      api.getHistory(50, 0).then((d) => setHistory(d.items || [])).catch(() => {});
    }
    if (view === "models") {
      api.getModels().then(setModels).catch(() => {});
    }
  }, [view]);

  const handleNewSession = () => {
    resetSession();
    setView("workflow");
  };

  const renderWorkflow = () => {
    if (!sessionId) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
          <div className="text-center">
            <h1 className="text-2xl font-orbitron font-bold tracking-[0.3em] text-white/90 mb-2">
              PROMPT<span className="text-cyan neon-text">FORGE</span>
            </h1>
            <p className="text-xs font-jetbrains text-white/20 tracking-wider">
              AI PROMPT GENERATION SYSTEM
            </p>
          </div>
          <InputPanel />
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <InputPanel />
        <AnimatedSection show={!!intent}>
          <IntentCard />
        </AnimatedSection>
        <AnimatedSection show={currentState === "S5_CLARIFY" && pendingQuestions.length > 0}>
          <ClarificationWizard />
        </AnimatedSection>
        <AnimatedSection show={currentState === "S6_CLASSIFY" || currentState === "S7_MODEL_SELECT"}>
          <ModelSelector />
        </AnimatedSection>
        <AnimatedSection show={currentState === "S8_HARNESS_SELECT" || currentState === "S9_OPTIMIZE" || currentState === "S10_GENERATE"}>
          <ModelSelector />
        </AnimatedSection>
        <AnimatedSection show={currentState === "S8_HARNESS_SELECT" || currentState === "S9_OPTIMIZE" || currentState === "S10_GENERATE"}>
          <HarnessPanel />
        </AnimatedSection>
        <AnimatedSection show={!!generatedPrompt}>
          <PromptOutput />
        </AnimatedSection>

        {generatedPrompt && (
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setShowExport(true)}
              className="px-5 py-2.5 rounded-lg border border-cyan/20 text-[11px] font-orbitron text-cyan/50 hover:text-cyan hover:border-cyan/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all duration-300 tracking-wider"
            >
              EXPORT PROMPT
            </button>
            <button
              onClick={handleNewSession}
              className="px-5 py-2.5 rounded-lg border border-magenta/20 text-[11px] font-orbitron text-magenta/50 hover:text-magenta hover:border-magenta/40 hover:shadow-[0_0_20px_rgba(255,0,85,0.15)] transition-all duration-300 tracking-wider"
            >
              NEW SESSION
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="w-8 h-8 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
            <span className="text-cyan/60 font-orbitron text-xs tracking-wider animate-pulse">
              Processing...
            </span>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-magenta/20 bg-magenta/[0.03]"
          >
            <p className="text-xs font-jetbrains text-magenta/70">{error}</p>
          </motion.div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="space-y-4">
      <NeonText as="h2" className="text-lg tracking-[0.2em]">PROMPT HISTORY</NeonText>
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-4xl opacity-20">&#9670;</span>
          <p className="text-sm text-white/20 font-jetbrains">No prompts generated yet.</p>
        </div>
      )}
      <div className="space-y-2">
        {history.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-cyan/[0.06] bg-glass hover:border-cyan/15 hover:bg-glass-hover transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-jetbrains text-white/60 group-hover:text-white/80 transition-colors">
                {item.title || "Untitled"}
              </span>
              <span className="text-[9px] font-jetbrains text-cyan/30 px-2 py-0.5 rounded-full border border-cyan/10">
                {item.target_model}
              </span>
            </div>
            <p className="text-[10px] text-white/20 mt-1.5 truncate font-rajdhani">{item.original_request}</p>
            <div className="flex items-center gap-3 mt-2.5">
              <span className="text-[9px] font-jetbrains text-white/25">Complexity: {item.complexity_score}</span>
              <span className="text-[9px] font-jetbrains text-white/15">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => api.deleteHistory(item.id).then(() => setHistory(history.filter((h) => h.id !== item.id)))}
                className="ml-auto text-[9px] font-jetbrains text-white/15 hover:text-magenta/70 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderModels = () => (
    <div className="space-y-4">
      <NeonText as="h2" className="text-lg tracking-[0.2em]">MODEL REGISTRY</NeonText>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {models.map((m, idx) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-4 rounded-xl border border-cyan/[0.06] bg-glass hover:border-cyan/15 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-orbitron text-white/70 tracking-wider">{m.name}</span>
              <span className="text-[9px] font-jetbrains text-cyan/30 px-1.5 py-0.5 rounded border border-cyan/10">{m.family}</span>
            </div>
            <p className="text-[10px] font-jetbrains text-white/30 leading-relaxed">{m.strengths}</p>
            <div className="flex flex-wrap gap-1 mt-2.5">
              {(m.supports_harnesses || []).slice(0, 4).map((h: string) => (
                <span key={h} className="px-1.5 py-0.5 rounded text-[8px] font-jetbrains bg-cyan/[0.03] text-cyan/30 border border-cyan/[0.06]">
                  {h}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-void">
      <Sidebar activeView={view} onNavigate={setView} onNewSession={handleNewSession} hasActiveSession={!!sessionId} />
      <div className="flex-1 ml-60">
        <TopBar currentState={currentState} sessionId={sessionId} />
        <main className="p-6 max-w-5xl mx-auto">
          {view === "workflow" && renderWorkflow()}
          {view === "history" && renderHistory()}
          {view === "analytics" && <AnalyticsDashboard />}
          {view === "models" && renderModels()}
          {view === "settings" && <SettingsModal onClose={() => setView("workflow")} />}
        </main>
      </div>
      {showExport && generatedPrompt && (
        <ExportModal prompt={generatedPrompt} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}

function AnimatedSection({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function NeonText({ children, className = "", as: Tag = "span" }: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "span" | "p";
}) {
  return <Tag className={`font-orbitron tracking-wider text-cyan neon-text ${className}`}>{children}</Tag>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
