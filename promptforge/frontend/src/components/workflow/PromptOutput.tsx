import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, FileText, GitBranch, Terminal, Code2, Download } from "lucide-react";
import HUDPanel from "../hud/HUDPanel";
import HUDTerminal from "../hud/HUDTerminal";
import NeonText from "../hud/NeonText";
import HUDButton from "../hud/HUDButton";
import CodePreview from "./CodePreview";
import { useSessionStore } from "../../stores/sessionStore";

type Tab = "prompt" | "trace" | "validation" | "code";

export default function PromptOutput() {
  const [activeTab, setActiveTab] = useState<Tab>("prompt");
  const [copied, setCopied] = useState(false);
  const { generatedPrompt, reasoningTrace, validationResult } = useSessionStore();

  if (!generatedPrompt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedPrompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "promptforge-output.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "prompt", label: "Final Prompt", icon: FileText },
    { id: "trace", label: "Reasoning Trace", icon: GitBranch },
    { id: "validation", label: "Validation", icon: Terminal },
    { id: "code", label: "Code Preview", icon: Code2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto"
    >
      <HUDPanel glow>
        <div className="flex items-center justify-between mb-4">
          <NeonText as="h3" className="text-sm tracking-[0.15em]">GENERATED OUTPUT</NeonText>
          <div className="flex gap-1.5">
            <HUDButton variant="ghost" onClick={handleCopy} size="sm">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </HUDButton>
            <HUDButton variant="ghost" onClick={handleDownload} size="sm">
              <Download size={13} />
            </HUDButton>
          </div>
        </div>

        <div className="flex gap-0 mb-4 border-b border-white/[0.04]">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-jetbrains tracking-wider transition-all duration-200 relative ${
                  activeTab === t.id
                    ? "text-cyan"
                    : "text-white/25 hover:text-white/50"
                }`}
              >
                <Icon size={11} />
                {t.label}
                {activeTab === t.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-40"
        >
          {activeTab === "prompt" && (
            <div className="terminal-output p-4 font-jetbrains text-sm whitespace-pre-wrap leading-relaxed text-green-300/70 overflow-auto max-h-[28rem]">
              {generatedPrompt}
            </div>
          )}
          {activeTab === "trace" && (
            <HUDTerminal
              lines={(reasoningTrace || "No reasoning trace available").split("\n")}
              title="reasoning trace"
            />
          )}
          {activeTab === "validation" && (
            <HUDTerminal
              title="validation log"
              lines={
                validationResult?.checks
                  ? validationResult.checks.map(
                      (c) => `[${c.status === "PASS" ? "PASS" : "FAIL"}] ${c.check}: ${c.message}`
                    )
                  : ["No validation data available."]
              }
            />
          )}
          {activeTab === "code" && (
            <CodePreview code={generatedPrompt} />
          )}
        </motion.div>
      </HUDPanel>
    </motion.div>
  );
}
