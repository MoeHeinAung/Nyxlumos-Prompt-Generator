import { Star, Target, Box } from "lucide-react";
import HUDPanel from "../hud/HUDPanel";
import NeonText from "../hud/NeonText";
import { useSessionStore } from "../../stores/sessionStore";

export default function IntentCard() {
  const { intent, classification } = useSessionStore();
  if (!intent) return null;

  const complexity = intent.complexity_score || classification?.complexity_score || 1;

  const complexityLabel = complexity <= 2 ? "Low" : complexity <= 3 ? "Medium" : complexity <= 4 ? "High" : "Expert";

  return (
    <HUDPanel className="w-full max-w-2xl mx-auto" animate glow>
      <div className="flex items-center justify-between mb-4">
        <NeonText as="h3" className="text-sm tracking-[0.15em]">INTENT ANALYSIS</NeonText>
        <span className="px-2.5 py-0.5 rounded-full border border-amber/20 text-[10px] font-jetbrains text-amber/60 tracking-wider">
          {(classification?.domain || intent.domain || "general").toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="accent-line-left">
          <p className="text-[9px] font-jetbrains text-cyan/30 uppercase tracking-[0.15em] mb-1">Primary Intent</p>
          <p className="text-sm text-white/70 font-rajdhani font-medium">{intent.primary_intent}</p>
        </div>
        <div className="accent-line-left">
          <p className="text-[9px] font-jetbrains text-cyan/30 uppercase tracking-[0.15em] mb-1">Scope</p>
          <p className="text-sm text-white/70 font-rajdhani capitalize">{intent.scope || classification?.scope || "general"}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Target size={12} className="text-amber/60" />
          <span className="text-[9px] font-jetbrains text-white/30 uppercase tracking-wider">Complexity</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={12}
              className={n <= complexity ? "text-amber fill-amber/80" : "text-white/[0.08]"}
            />
          ))}
        </div>
        <span className="text-[10px] font-jetbrains text-amber/50 ml-auto">{complexityLabel}</span>
      </div>

      {intent.output_type && (
        <div className="mt-3 flex items-center gap-2">
          <Box size={11} className="text-cyan/40" />
          <span className="text-[10px] font-jetbrains text-white/30">Output: </span>
          <span className="text-[10px] font-jetbrains text-cyan/50 bg-cyan/[0.04] px-2 py-0.5 rounded border border-cyan/10">
            {intent.output_type}
          </span>
        </div>
      )}

      {intent.recommended_harness && intent.recommended_harness.length > 0 && (
        <div className="mt-4 pt-3 border-t border-cyan/5">
          <p className="text-[9px] font-jetbrains text-cyan/30 uppercase tracking-[0.15em] mb-2">Recommended Harnesses</p>
          <div className="flex flex-wrap gap-1.5">
            {intent.recommended_harness.map((h: string) => (
              <span key={h} className="px-2 py-0.5 rounded-full border border-cyan/15 text-[9px] font-jetbrains text-cyan/50 bg-cyan/[0.03]">
                {h}
              </span>
            ))}
          </div>
        </div>
      )}
    </HUDPanel>
  );
}
