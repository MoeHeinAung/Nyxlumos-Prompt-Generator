import { motion } from "framer-motion";
import { X, Copy, Download, Check } from "lucide-react";
import HUDButton from "../hud/HUDButton";
import NeonText from "../hud/NeonText";
import { useState } from "react";

interface Props {
  prompt: string;
  onClose: () => void;
}

export default function ExportModal({ prompt, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "promptforge-prompt.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-void-light border border-cyan/20 rounded-xl p-6 w-full max-w-xl shadow-[0_0_60px_rgba(0,240,255,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <NeonText as="h3" className="text-sm tracking-[0.15em]">EXPORT PROMPT</NeonText>
          <button onClick={onClose} className="p-1 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.04] transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="bg-black/50 border border-cyan/10 rounded-lg p-4 font-jetbrains text-xs text-white/50 max-h-52 overflow-auto mb-5 leading-relaxed whitespace-pre-wrap">
          {prompt.slice(0, 600)}{prompt.length > 600 ? "..." : ""}
        </div>

        <div className="flex gap-2.5">
          <HUDButton onClick={handleCopy} size="sm">
            {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
            {copied ? "Copied" : "Copy to Clipboard"}
          </HUDButton>
          <HUDButton variant="amber" onClick={handleDownload} size="sm">
            <Download size={14} className="mr-1" /> Download .txt
          </HUDButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
