import NeonText from "../hud/NeonText";

interface Props {
  currentState: string;
  sessionId: string | null;
}

const STATE_LABELS: Record<string, string> = {
  S1_INGEST: "Initializing",
  S2_TRANSLATE: "Translating",
  S3_EXTRACT: "Analyzing Intent",
  S4_GAP_ANALYSIS: "Gap Analysis",
  S5_CLARIFY: "Clarification",
  S6_CLASSIFY: "Classifying",
  S7_MODEL_SELECT: "Model Selection",
  S8_HARNESS_SELECT: "Harness Config",
  S9_OPTIMIZE: "Optimizing",
  S10_GENERATE: "Generating",
  S11_VALIDATE: "Validation",
  S12_EXPORT: "Ready",
};

const STATE_STEP: Record<string, number> = {
  S1_INGEST: 1, S2_TRANSLATE: 2, S3_EXTRACT: 3, S4_GAP_ANALYSIS: 4,
  S5_CLARIFY: 5, S6_CLASSIFY: 6, S7_MODEL_SELECT: 7, S8_HARNESS_SELECT: 8,
  S9_OPTIMIZE: 9, S10_GENERATE: 10, S11_VALIDATE: 11, S12_EXPORT: 12,
};

export default function TopBar({ currentState, sessionId }: Props) {
  const step = STATE_STEP[currentState] || 1;
  const progressPct = Math.round((step / 12) * 100);

  return (
    <header className="h-14 border-b border-cyan/5 flex items-center justify-between px-6 bg-void/80 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          <NeonText className="text-[11px] tracking-[0.15em]">{STATE_LABELS[currentState] || currentState}</NeonText>
        </div>
        {sessionId && (
          <span className="text-[10px] font-jetbrains text-white/20 tracking-wider">
            #{sessionId.slice(0, 8)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className={`w-2.5 h-0.5 rounded-full transition-all duration-500 ${
                i < step ? "bg-cyan/60" : "bg-white/[0.06]"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] font-jetbrains text-cyan/40 tabular-nums min-w-[3ch] text-right">
          {progressPct}%
        </span>
      </div>
    </header>
  );
}
