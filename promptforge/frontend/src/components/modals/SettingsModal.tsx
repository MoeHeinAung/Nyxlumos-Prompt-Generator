import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Key, Server, Check } from "lucide-react";
import HUDButton from "../hud/HUDButton";
import NeonText from "../hud/NeonText";

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem("pf_deepseek_key");
    const savedUrl = localStorage.getItem("pf_ollama_url");
    if (savedKey) setApiKey(savedKey);
    if (savedUrl) setOllamaUrl(savedUrl);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) localStorage.setItem("pf_deepseek_key", apiKey.trim());
    else localStorage.removeItem("pf_deepseek_key");
    localStorage.setItem("pf_ollama_url", ollamaUrl.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        className="bg-void-light border border-cyan/20 rounded-xl p-6 w-full max-w-md shadow-[0_0_60px_rgba(0,240,255,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <NeonText as="h3" className="text-sm tracking-[0.15em]">SETTINGS</NeonText>
          <button onClick={onClose} className="p-1 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.04] transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-[10px] font-jetbrains text-cyan/40 uppercase tracking-wider mb-1.5">
              <Key size={11} /> DeepSeek API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-xxxxxxxx"
              className="w-full bg-black/40 border border-cyan/10 rounded-lg px-3.5 py-2.5 text-xs font-jetbrains text-white focus:border-cyan/40 transition-all duration-300"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-[10px] font-jetbrains text-cyan/40 uppercase tracking-wider mb-1.5">
              <Server size={11} /> Ollama Base URL
            </label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full bg-black/40 border border-cyan/10 rounded-lg px-3.5 py-2.5 text-xs font-jetbrains text-white focus:border-cyan/40 transition-all duration-300"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-white/[0.04]">
          <HUDButton variant="ghost" onClick={onClose} size="sm">Cancel</HUDButton>
          <HUDButton onClick={handleSave} size="sm">
            {saved ? <Check size={14} className="mr-1" /> : null}
            {saved ? "Saved" : "Save Settings"}
          </HUDButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
