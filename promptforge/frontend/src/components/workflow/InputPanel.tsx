import { useState } from "react";
import { Send, Languages } from "lucide-react";
import HUDPanel from "../hud/HUDPanel";
import HUDButton from "../hud/HUDButton";
import NeonText from "../hud/NeonText";
import { useSessionStore } from "../../stores/sessionStore";

export default function InputPanel() {
  const [input, setInput] = useState("");
  const { isLoading, startSession, detectedLanguage, translatedInput } = useSessionStore();

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    await startSession(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <HUDPanel cornerBrackets className="w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <NeonText as="h3" className="text-sm tracking-[0.2em]">
          NEW PROMPT REQUEST
        </NeonText>
        {detectedLanguage && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-cyan/20 text-[10px] font-jetbrains text-cyan/50">
            <Languages size={10} />
            {detectedLanguage === "my" ? "Burmese" : "English"}
          </span>
        )}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want the AI to do..."
        className="w-full h-36 bg-black/40 border border-cyan/10 rounded-lg p-4 text-white/80 font-jetbrains text-sm resize-none focus:border-cyan/40 placeholder-white/15 transition-all duration-300"
        disabled={isLoading}
      />

      <div className="flex items-center justify-between mt-3">
        <div className="flex-1">
          {translatedInput && detectedLanguage === "my" && (
            <div className="p-2.5 rounded-lg bg-amber/[0.03] border border-amber/10">
              <p className="text-[9px] font-jetbrains text-amber/40 uppercase tracking-wider mb-1">Translation Preview</p>
              <p className="text-xs text-white/50 font-jetbrains">{translatedInput}</p>
            </div>
          )}
        </div>
        <HUDButton onClick={handleSubmit} loading={isLoading} disabled={!input.trim()}>
          <Send size={14} className="mr-1.5" /> Submit
        </HUDButton>
      </div>
    </HUDPanel>
  );
}
