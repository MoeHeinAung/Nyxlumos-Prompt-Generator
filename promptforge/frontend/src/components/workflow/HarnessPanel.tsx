import { motion } from "framer-motion";
import { Brain, Code2, MessageSquare, Target, Users, ToggleLeft, ToggleRight, Zap } from "lucide-react";
import HUDPanel from "../hud/HUDPanel";
import HUDButton from "../hud/HUDButton";
import NeonText from "../hud/NeonText";
import { useSessionStore } from "../../stores/sessionStore";

const HARNESS_CONFIG = [
  { id: "reasoning_scaffold", label: "Reasoning Scaffold", icon: Brain, description: "Chain / Tree / Graph-of-Thought reasoning", tag: "Complexity 3+" },
  { id: "meta_cognitive", label: "Meta-Cognitive Layer", icon: MessageSquare, description: "Self-critique and verification protocol", tag: "Complexity 4+" },
  { id: "constraint_satisfaction", label: "Constraint Satisfaction", icon: Target, description: "Decision matrix with weighted scoring", tag: "Decisions" },
  { id: "code_execution", label: "Code Execution Sandbox", icon: Code2, description: "Isolated subprocess validation + auto-fix", tag: "Code" },
  { id: "debate", label: "Multi-Agent Debate", icon: Users, description: "Architect → Critic → Refiner → Judge", tag: "Expert" },
];

export default function HarnessPanel() {
  const { enabledHarnesses, toggleHarness, generatePrompt, isLoading, selectedModel } = useSessionStore();
  const activeCount = enabledHarnesses.length;

  return (
    <HUDPanel className="w-full max-w-3xl mx-auto" glow>
      <div className="flex items-center justify-between mb-4">
        <div>
          <NeonText as="h3" className="text-sm tracking-[0.15em]" variant="magenta">HARNESS CONFIGURATION</NeonText>
          <p className="text-[9px] font-jetbrains text-white/20 mt-0.5 tracking-wider">
            {activeCount} OF {HARNESS_CONFIG.length} ACTIVE
          </p>
        </div>
        <HUDButton variant="magenta" onClick={generatePrompt} loading={isLoading} disabled={activeCount === 0 || !selectedModel}>
          <Zap size={14} className="mr-1.5" /> Generate
        </HUDButton>
      </div>

      <div className="space-y-1.5">
        {HARNESS_CONFIG.map((h, idx) => {
          const Icon = h.icon;
          const isEnabled = enabledHarnesses.includes(h.id);
          return (
            <motion.button
              key={h.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ x: 3 }}
              onClick={() => toggleHarness(h.id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300 group ${
                isEnabled
                  ? "border-magenta/30 bg-magenta/[0.04] shadow-[0_0_16px_rgba(255,0,85,0.06)]"
                  : "border-white/[0.04] bg-glass hover:border-white/[0.08] hover:bg-glass-hover"
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isEnabled ? "bg-magenta/[0.08] text-magenta" : "bg-white/[0.02] text-white/15 group-hover:text-white/30"}`}>
                <Icon size={16} />
              </div>
              <div className="text-left flex-1">
                <p className={`text-xs font-jetbrains tracking-wide ${isEnabled ? "text-white/90" : "text-white/40"}`}>
                  {h.label}
                </p>
                <p className="text-[10px] text-white/20 mt-0.5">{h.description}</p>
              </div>
              <span className={`text-[8px] font-jetbrains px-2 py-0.5 rounded-full border ${
                isEnabled ? "border-magenta/20 text-magenta/50 bg-magenta/[0.04]" : "border-white/[0.04] text-white/15 bg-white/[0.02]"
              }`}>
                {h.tag}
              </span>
              {isEnabled ? (
                <ToggleRight size={22} className="text-magenta/80" />
              ) : (
                <ToggleLeft size={22} className="text-white/[0.08]" />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {enabledHarnesses.map((h, i) => (
              <div key={h} className="w-2.5 h-2.5 rounded-full bg-magenta/60 border-2 border-void" style={{ opacity: 1 - i * 0.1 }} />
            ))}
            {enabledHarnesses.length === 0 && (
              <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06] border-2 border-void" />
            )}
          </div>
          <span className="text-[9px] font-jetbrains text-white/25 tracking-wider">
            {activeCount > 0 ? `Applied to ${selectedModel}` : "Select at least one harness"}
          </span>
        </div>
        <span className="text-[9px] font-jetbrains text-magenta/30">S8_HARNESS</span>
      </div>
    </HUDPanel>
  );
}
