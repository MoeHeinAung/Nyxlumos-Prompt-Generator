import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cpu, Sparkles, Globe, PenTool, Image, Shield, Zap } from "lucide-react";
import HUDPanel from "../hud/HUDPanel";
import NeonText from "../hud/NeonText";
import { useSessionStore } from "../../stores/sessionStore";
import { api } from "../../api/client";
import type { ModelInfo } from "../../types";

const MODEL_ICONS: Record<string, any> = {
  deepseek: Cpu,
  openai: Globe,
  anthropic: Shield,
  meta: Sparkles,
  midjourney: Image,
  stability: PenTool,
};

const FAMILY_COLORS: Record<string, string> = {
  deepseek: "border-cyan/30 bg-cyan/[0.04]",
  openai: "border-green-400/20 bg-green-400/[0.04]",
  anthropic: "border-amber/20 bg-amber/[0.04]",
  meta: "border-purple-400/20 bg-purple-400/[0.04]",
  midjourney: "border-magenta/20 bg-magenta/[0.04]",
  stability: "border-blue-400/20 bg-blue-400/[0.04]",
};

export default function ModelSelector() {
  const { selectedModel, selectModel, currentState, isLoading: storeLoading } = useSessionStore();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const isConfirmed = currentState === "S8_HARNESS_SELECT" || currentState === "S9_OPTIMIZE" || currentState === "S10_GENERATE";

  useEffect(() => {
    api.getModels().then(setModels).catch(() => {});
  }, []);

  const handleSelect = async (modelId: string) => {
    if (isConfirmed || storeLoading) return;
    setPendingConfirm(modelId);
    await selectModel(modelId);
    setPendingConfirm(null);
  };

  return (
    <HUDPanel className="w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <NeonText as="h3" className="text-sm tracking-[0.15em]">
          {isConfirmed ? "TARGET MODEL" : "SELECT TARGET MODEL"}
        </NeonText>
        {isConfirmed && (
          <span className="flex items-center gap-1.5 text-[10px] font-jetbrains text-green-400/70">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Confirmed
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {models.map((m) => {
          const Icon = MODEL_ICONS[m.family] || Cpu;
          const isSelected = selectedModel === m.id;
          const isPending = pendingConfirm === m.id;
          const familyStyle = FAMILY_COLORS[m.family] || FAMILY_COLORS.deepseek;

          return (
            <motion.button
              key={m.id}
              whileHover={isConfirmed ? {} : { scale: 1.03, y: -2 }}
              whileTap={isConfirmed ? {} : { scale: 0.97 }}
              onClick={() => handleSelect(m.id)}
              disabled={isConfirmed || !!pendingConfirm}
              className={`relative p-4 rounded-xl border text-left transition-all duration-300 group ${
                isSelected
                  ? `${familyStyle} shadow-[0_0_20px_rgba(0,240,255,0.08)]`
                  : "border-white/[0.06] hover:border-cyan/20 bg-glass hover:bg-glass-hover"
              } ${isConfirmed ? "cursor-default" : "cursor-pointer"}`}
            >
              {isPending && (
                <div className="absolute inset-0 rounded-xl bg-cyan/[0.05] flex items-center justify-center z-10">
                  <span className="w-5 h-5 border-2 border-cyan/40 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <Icon size={22} className={isSelected ? "text-cyan" : "text-white/20 group-hover:text-white/40 transition-colors"} />
                {isSelected && <Zap size={12} className="text-cyan/60" />}
              </div>

              <p className="text-sm font-orbitron mb-1 text-white/80 tracking-wider">{m.name}</p>
              <p className="text-[10px] font-jetbrains text-white/30 leading-relaxed">{m.strengths}</p>

              {m.supports_harnesses && m.supports_harnesses.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-white/[0.04]">
                  {m.supports_harnesses.slice(0, 3).map((h: string) => (
                    <span
                      key={h}
                      className="px-1.5 py-0.5 rounded text-[8px] font-jetbrains bg-white/[0.03] text-white/25 border border-white/[0.05]"
                    >
                      {h.split("_")[0]}
                    </span>
                  ))}
                  {m.supports_harnesses.length > 3 && (
                    <span className="text-[8px] font-jetbrains text-white/15">+{m.supports_harnesses.length - 3}</span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </HUDPanel>
  );
}
