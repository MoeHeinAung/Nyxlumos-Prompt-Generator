import { motion } from "framer-motion";
import { Clock, BarChart3, Database, Settings, Plus, Layers } from "lucide-react";
import NeonText from "../hud/NeonText";

interface Props {
  activeView: string;
  onNavigate: (view: string) => void;
  onNewSession: () => void;
  hasActiveSession: boolean;
}

const navItems = [
  { id: "workflow", label: "Workflow", icon: Layers },
  { id: "history", label: "History", icon: Clock },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "models", label: "Model Registry", icon: Database },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ activeView, onNavigate, onNewSession, hasActiveSession }: Props) {
  return (
    <aside className="w-60 h-screen fixed left-0 top-0 bg-void/95 backdrop-blur-xl border-r border-cyan/10 flex flex-col z-20">
      <div className="p-5 border-b border-cyan/10">
        <NeonText as="h2" className="text-lg tracking-[0.3em]">
          PROMPTFORGE
        </NeonText>
        <p className="text-[10px] text-cyan/40 font-jetbrains mt-1 tracking-wider">AI PROMPT GENERATOR v1.0</p>
      </div>

      <div className="px-3 pt-4 pb-2">
        <motion.button
          onClick={onNewSession}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-cyan/40 bg-cyan/5 text-cyan font-orbitron text-[11px] tracking-wider hover:bg-cyan/10 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all duration-300"
        >
          <Plus size={14} />
          New Session
        </motion.button>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              whileHover={{ x: 4 }}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-all duration-200 ${
                isActive
                  ? "text-cyan border-l-[3px] border-cyan bg-cyan/5"
                  : "text-white/50 hover:text-white/80 border-l-[3px] border-transparent"
              }`}
            >
              <Icon size={16} />
              <span className="font-orbitron text-[11px] tracking-wider">{item.label}</span>
              {item.id === "workflow" && hasActiveSession && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-cyan/10">
        <div className="flex items-center gap-2 text-[10px] font-jetbrains text-cyan/40">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          SYSTEM ONLINE
        </div>
      </div>
    </aside>
  );
}
